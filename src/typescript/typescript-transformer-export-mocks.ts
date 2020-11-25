import ts from "typescript"

interface IExportedNode<T extends ts.Node>{
  readonly exportedNames: string[]
  readonly node: T
}

function isNodeExported(node: ts.Node): boolean{
  return !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
}

function isNodeDefaultExported(node: ts.Node): boolean{
  // default export assignment
  if(ts.isExportAssignment(node)) return true
  // otherwise is default class, function declaration
  return isNodeExported(node) && !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)
}

function visitIdentifier(factory: ts.NodeFactory, node: ts.Identifier): ts.Identifier{
  return factory.createIdentifier(node.text + "$1")
}

function isExportedDeclaration(node: ts.Node): node is ts.ClassDeclaration | ts.EnumDeclaration | ts.FunctionDeclaration{
  return ts.isFunctionDeclaration(node) || ts.isEnumDeclaration(node) || ts.isClassDeclaration(node)
}

function visitDeclaration<T extends ts.ClassDeclaration | ts.EnumDeclaration | ts.FunctionDeclaration>(factory: ts.NodeFactory, declaration: T): IExportedNode<T>{
  const name = visitIdentifier(factory, declaration.name!)
  let node!: T
  if(ts.isFunctionDeclaration(declaration)){
    node = factory.updateFunctionDeclaration(declaration, declaration.decorators, declaration.modifiers, declaration.asteriskToken,
      name, declaration.typeParameters, declaration.parameters, declaration.type, declaration.body) as T
  }else if(ts.isEnumDeclaration(declaration)){
    node = factory.updateEnumDeclaration(declaration, declaration.decorators, declaration.modifiers, name, declaration.members) as T
  }else if(ts.isClassDeclaration(declaration)){
    node = factory.updateClassDeclaration(declaration, declaration.decorators, declaration.modifiers, name, declaration.typeParameters,
      declaration.heritageClauses, declaration.members) as T
  }
  return {
    exportedNames: [ declaration.name!.text ],
    node,
  }
}

function visitVariableStatement<T extends ts.VariableStatement>(context: ts.TransformationContext, variableStatement: T): IExportedNode<T>{
  const exportedNames: string[] = []

  const visitor: ts.Visitor = node => {
    if(ts.isVariableDeclaration(node)){
      return context.factory.updateVariableDeclaration(node, ts.visitNode(node.name, visitor), node.exclamationToken,
        node.type, node.initializer)
    }else if(ts.isIdentifier(node)){
      exportedNames.push(node.text)
      return visitIdentifier(context.factory, node)
    }else if(ts.isBindingElement(node)){
      return context.factory.updateBindingElement(node, node.dotDotDotToken, node.propertyName,
        ts.visitNode(node.name, visitor), node.initializer)
    }else if(ts.isVariableStatement(node)){
      const visited = ts.visitEachChild(node, visitor, context)
      const filteredModifiers = visited.modifiers?.filter(m => m.kind !== ts.SyntaxKind.ExportKeyword)
      return context.factory.updateVariableStatement(visited, filteredModifiers, visited.declarationList)
    }
    return ts.visitEachChild(node, visitor, context)
  }

  return {
    exportedNames,
    node: ts.visitNode(variableStatement, visitor),
  }
}

function visitExportDeclaration(context: ts.TransformationContext,
  exportDeclaration: ts.ExportDeclaration): IExportedNode<ts.ImportDeclaration>{
  const { factory } = context
  const exportedNames: string[] = []
  let namespaceImport: ts.NamespaceImport
  const importSpecifiers: ts.ImportSpecifier[] = []

  const visitor: ts.Visitor = node => {
    if(ts.isNamespaceExport(node)){
      exportedNames.push(node.name.text)
      namespaceImport = factory.createNamespaceImport(visitIdentifier(factory, node.name))
    }else if(ts.isExportSpecifier(node)){
      exportedNames.push(node.name.text)
      importSpecifiers.push(factory.createImportSpecifier(node.propertyName ?? node.name, visitIdentifier(factory, node.name)))
    }else if(ts.isExportDeclaration(node)){
      // visit children first
      ts.visitEachChild(node, visitor, context)
      // convert into import
      const namedBindings = namespaceImport ? namespaceImport : factory.createNamedImports(importSpecifiers)
      const importClause = factory.createImportClause(false, undefined, namedBindings)
      return factory.createImportDeclaration(undefined, undefined, importClause, node.moduleSpecifier!)
    }
    return ts.visitEachChild(node, visitor, context)
  }

  return {
    exportedNames,
    node: ts.visitNode(exportDeclaration, visitor) as any,
  }
}

function cleanModifiers(factory: ts.NodeFactory, expr: ts.Declaration){
  const modifiers = ts.getCombinedModifierFlags(expr)
  // remove export and default
  return factory.createModifiersFromModifierFlags(modifiers ^ (ts.ModifierFlags.Default | ts.ModifierFlags.Export))
}

function visitDefaultExport(factory: ts.NodeFactory, defaultExport: ts.Node): IExportedNode<ts.VariableStatement>{
  const exportedNames: string[] = [ "default" ]
  let expr: ts.Expression

  if(ts.isExportAssignment(defaultExport)){
    expr = defaultExport.expression
  }else{
    expr = defaultExport as ts.Expression
  }

  if(ts.isClassDeclaration(expr)){
    expr = factory.createClassExpression(expr.decorators, cleanModifiers(factory, expr), expr.name, expr.typeParameters, expr.heritageClauses, expr.members)
  }else if(ts.isFunctionDeclaration(expr)){
    expr = factory.createFunctionExpression(cleanModifiers(factory, expr), expr.asteriskToken, expr.name, expr.typeParameters, expr.parameters, expr.type, expr.body ?? factory.createBlock([]))
  }

  const declarations = factory.createVariableDeclarationList(
    [ factory.createVariableDeclaration("default$1", undefined, undefined, expr) ],
    ts.NodeFlags.Const,
  )
  const node = factory.createVariableStatement(undefined, declarations)

  return {
    exportedNames,
    node,
  }
}

function getExportVarName(name: string){
  return name === "default" ? "default$default" : name
}

function createExportedNames(factory: ts.NodeFactory, exportedNames: string[]){
  const declarations = factory.createVariableDeclarationList(
    exportedNames.map(n => {
      const expName = getExportVarName(n)
      return factory.createVariableDeclaration(expName, undefined, undefined, factory.createIdentifier(n + "$1"))
    }),
    ts.NodeFlags.Let,
  )
  return factory.createVariableStatement(factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export), declarations)
}

function createMockHelpers(fileName: string, exportNames: string[]){
  const mapLines = exportNames.map(n => `${ n }: ${ n }$1,`)
    .join("\n")
  const caseLines = exportNames
    .map(n => {
      return `
              case "${ n }":{
                 ${ n } = value
                 break
              }
            `
    })
    .join("\n")
  // language=ts
  const src = `
    const __mock_originals_map__ = {
      ${ mapLines }
    }

    export function __mock_reset__(prop){
      __mock_set__(prop, __mock_originals_map__[prop])
    }

    export function __mock_original__(prop){
      return __mock_originals_map__[prop]
    }

    export function __mock_set__(prop, value){
      switch(prop){
        ${ caseLines }
      }
    }
  `
  // convert into statements
  const srcFile = ts.createSourceFile(fileName, src, ts.ScriptTarget.ESNext, false, ts.ScriptKind.JS)
  // Synthesize all nodes and remove their source positions
  const visitor = (node: any) => {
    node.pos = -1
    node.end = -1
    node.flags |= ts.NodeFlags.Synthesized
    node.forEachChild(visitor)
  }
  visitor(srcFile)
  return srcFile.statements
}


/**
 * This converts a module into a mockable module.
 * All exports are changed from being constants to variables and mock helper
 * functions are exported on the module to allow mocking.
 *
 * Example take the following module
 * ```typescript
 * export function foobar(){}
 * export const dude = 10, cool = "Erg"
 * ```
 *
 * Will be converted into
 * ```typescript
 * function foobar$1(){}
 * const dude$1 = 10, cool$1 = "Erg"
 * export let dude = dude$1, cool = cool$1
 * export let foobar = foobar$1
 * const __mock_originals_map__ = {
 *     "dude": dude$1,
 *     "cool": cool$1,
 *     "foobar": foobar$1,
 * }
 * const __mock_global_prop = Symbol.for("__mock_set__{MODULE_PATH}")
 * if(!global[__mock_global_prop]){
 *    global[__mock_global_prop] = []
 * }
 * export function __mock_reset__(prop: string){
 *    __mock_set__(prop, __mock_originals_map__[prop])
 * }
 * export function __mock_original__(prop: string) {
 *   return __mock_originals_map__[prop]
 * }
 * export function __mock_set__(prop: string, value: any){
 *   switch(prop){
 *     case "dude":{
 *         dude = value
 *         break
 *     }
 *     case "cool":{
 *         cool = value
 *         break
 *     }
 *     case "foobar":{
 *         foobar = value
 *         break
 *     }
 *   }
 *   global[__mock_global_prop].filter(s => s !== __mock_set__).forEach(s => s(prop, value))
 * }
 * global[__mock_global_prop].push(__mock_set__)
 * ```
 */
export default function typescriptTransformerExportMock(): ts.CustomTransformers{
  return {
    after: [
      context => {
        const { factory } = context
        return node => {
          let exportedNames: string[] = []

          const visitor: ts.Visitor = node => {
            if(isNodeDefaultExported(node)){
              const visitResult = visitDefaultExport(factory, node)
              const defaultAssignment = factory.createExportAssignment(undefined, undefined, undefined,
                factory.createIdentifier(getExportVarName(visitResult.exportedNames[0])))
              exportedNames = exportedNames.concat(visitResult.exportedNames)
              return [
                visitResult.node,
                createExportedNames(factory, visitResult.exportedNames),
                defaultAssignment,
              ]
            }else if(isNodeExported(node) && ts.isVariableStatement(node)){
              const visitResult = visitVariableStatement(context, node)
              exportedNames = exportedNames.concat(visitResult.exportedNames)
              return [
                visitResult.node,
                createExportedNames(factory, visitResult.exportedNames),
              ]
            }else if(isNodeExported(node) && isExportedDeclaration(node)){
              const visitResult = visitDeclaration(factory, node)
              exportedNames = exportedNames.concat(visitResult.exportedNames)
              return [
                visitResult.node,
                createExportedNames(factory, visitResult.exportedNames),
              ]
            }else if(ts.isExportDeclaration(node)){
              const visitResult = visitExportDeclaration(context, node)
              exportedNames = exportedNames.concat(visitResult.exportedNames)
              return [
                visitResult.node,
                createExportedNames(factory, visitResult.exportedNames),
              ]
            }else if(ts.isSourceFile(node)){
              // don't mock spec files
              if(/\.(spec|int)\.[tj]sx?/.test(node.fileName)){
                return node
              }
              // visit children
              const srcFile = ts.visitEachChild(node, visitor, context)
              const hasExports = srcFile.statements.some(stmt => isNodeExported(ts.getOriginalNode(stmt)))
              if(hasExports){
                const statements = [
                  ...srcFile.statements,
                  // append mock helpers
                  ...createMockHelpers(node.fileName, exportedNames),
                ]
                return context.factory.updateSourceFile(srcFile, statements, srcFile.isDeclarationFile, srcFile.referencedFiles,
                  srcFile.typeReferenceDirectives, srcFile.hasNoDefaultLib, srcFile.libReferenceDirectives)
              }else{
                return srcFile
              }
            }else{
              return node
            }
          }
          return visitor(node) as ts.SourceFile
        }
      },
    ],
  }
}
