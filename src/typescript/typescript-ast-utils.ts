import ts from "typescript"

export function getPropertyName(node: ts.PropertyName): string{
  let propName = ""
  switch(node.kind){
  case ts.SyntaxKind.Identifier:
  case ts.SyntaxKind.PrivateIdentifier:
  case ts.SyntaxKind.StringLiteral:{
    propName = node.text
    break
  }
  case ts.SyntaxKind.ComputedPropertyName:{
    if(ts.isIdentifier(node.expression) || ts.isStringLiteralLike(node.expression)){
      propName = node.expression.text
    }
  }
  }
  return propName
}

export const isMember = (combinedFlags: ts.ModifierFlags) => (m: ts.ClassElement): boolean => {
  const flags = ts.getCombinedModifierFlags(m)
  return (flags & combinedFlags) !== 0
}

export const isNotMember = (combinedFlags: ts.ModifierFlags) => (m: ts.ClassElement): boolean => {
  const flags = ts.getCombinedModifierFlags(m)
  return (flags & combinedFlags) === 0
}

export const isStatic = isMember(ts.ModifierFlags.Static)

export const isPublic = isNotMember(ts.ModifierFlags.Protected | ts.ModifierFlags.Private)

export function isClassMethodLike(m: ts.ClassElement): m is ts.AccessorDeclaration | ts.MethodDeclaration{
  return ts.isMethodDeclaration(m) || ts.isAccessor(m)
}

export const isPropertyWithName = (name: string, staticProp = false) => (m: ts.ClassElement): m is ts.PropertyDeclaration => {
  const propName = m.name ? getPropertyName(m.name) : undefined
  return ts.isPropertyDeclaration(m) && isStatic(m) === staticProp && name === propName
}

export const resolveOriginalSymbol = (typeChecker: ts.TypeChecker) => (symbol: ts.Symbol): ts.Symbol | undefined => {
  let aliasedSymbol: ts.Symbol = symbol
  while(aliasedSymbol && (aliasedSymbol.flags & ts.SymbolFlags.Alias)){
    aliasedSymbol = typeChecker.getAliasedSymbol(aliasedSymbol)
  }
  return aliasedSymbol
}

function isNullOrUndefinedKind(node: ts.Node): boolean{
  return node.kind === ts.SyntaxKind.NullKeyword
           || node.kind === ts.SyntaxKind.UndefinedKeyword
}

export function isNullableTypeNode(propType: ts.TypeNode): boolean{
  const recursive = (node: ts.TypeNode) => {
    if(ts.isUnionTypeNode(node)){
      return node.types.some(recursive)
    }else if(ts.isLiteralTypeNode(node)){
      return isNullOrUndefinedKind(node.literal)
    }else{
      return isNullOrUndefinedKind(node)
    }
  }
  return recursive(propType)
}

export function getTypeArgumentNodes(propType: ts.TypeNode, expandTypeArgs = false): readonly ts.TypeNode[]{
  if(ts.isParenthesizedTypeNode(propType)){
    return getTypeArgumentNodes(propType.type)
  }else if(ts.isTypeOperatorNode(propType)){
    return getTypeArgumentNodes(propType.type)
  }else if(ts.isArrayTypeNode(propType)){
    return getTypeArgumentNodes(propType.elementType)
  }else if(ts.isTypeReferenceNode(propType) && expandTypeArgs){
    return propType.typeArguments?.flatMap(a => getTypeArgumentNodes(a)) ?? []
  }
  return [ propType ]
}

export function propertyToTypeNode(property: ts.Symbol){
  const decl = property.getDeclarations()?.[0]
  return !!decl && (ts.isPropertyDeclaration(decl) || ts.isParameter(decl) || ts.isPropertySignature(decl)) ? decl.type : undefined
}

export function isBigIntLiteralType(type: ts.Type): type is ts.BigIntLiteralType{
  return !!(type.flags & ts.TypeFlags.BigIntLiteral)
}

export function isBooleanLiteralType(type: ts.Type): boolean{
  return !!(type.flags & ts.TypeFlags.BooleanLiteral)
}

export function isLiteralType(type: ts.Type): type is ts.BigIntLiteralType | ts.LiteralType{
  return type.isLiteral() || isBigIntLiteralType(type) || isBooleanLiteralType(type)
}

export const valueOfLiteralType = (typeChecker: ts.TypeChecker) => (t: ts.BigIntLiteralType | ts.LiteralType): bigint | boolean | number | string => {
  if(isBigIntLiteralType(t)){
    const { negative, base10Value } = t.value
    return BigInt((negative ? "-" : "") + base10Value)
  }else if(isBooleanLiteralType(t)){
    return typeChecker.typeToString(t) === "true"
  }
  return t.value as any
}

export interface IImportName{
    readonly moduleSpecifier: string
    readonly name: string
    readonly propertyName?: string
}

export function getAllImportReferences(sourceFile: ts.SourceFile): ReadonlyMap<string, IImportName>{
  const importDecls = sourceFile.statements.filter(ts.isImportDeclaration)
  const importReferences = new Map<string, IImportName>()
  for(const importDecl of importDecls){
    const namedBindings = importDecl.importClause?.namedBindings
    if(namedBindings && ts.isNamespaceImport(namedBindings)){
      importReferences.set(namedBindings.name.text, {
        moduleSpecifier: (importDecl.moduleSpecifier as ts.StringLiteral).text,
        name:            namedBindings.name.text,
      })
    }else if(namedBindings && ts.isNamedImports(namedBindings)){
      for(const element of namedBindings.elements){
        importReferences.set(element.name.text, {
          moduleSpecifier: (importDecl.moduleSpecifier as ts.StringLiteral).text,
          name:            element.name.text,
          propertyName:    element.propertyName?.text,
        })
      }
    }
  }
  return importReferences
}

export function createMissingImports(factory: ts.NodeFactory, srcFile: ts.SourceFile,
  specifiers: ReadonlyMap<string, readonly IImportName[]>): readonly ts.ImportDeclaration[]{
  const importRefs = getAllImportReferences(srcFile)
  // group by module specifier
  const nextImps = new Map<string, IImportName[]>()
  for(const [ specifier, imps ] of specifiers){
    for(const imp of imps){
      if(!importRefs.has(imp.name)){
        const imps = nextImps.get(specifier) ?? []
        imps.push(imp)
        nextImps.set(specifier, imps)
      }
    }
  }
  const nextImportDecls = []
  for(const [ specifier, imps ] of nextImps){
    const decl = factory.createImportDeclaration(undefined, undefined,
      factory.createImportClause(false, undefined,
        factory.createNamedImports(imps.map(i => factory.createImportSpecifier(
          i.propertyName ? factory.createIdentifier(i.propertyName) : undefined,
          factory.createIdentifier(i.name),
        ))),
      ),
      factory.createStringLiteral(specifier),
    )
    nextImportDecls.push(decl)
  }
  return nextImportDecls
}

export function mergeStatements<T>(currentStatements: readonly ts.Statement[],
  insertStatements: readonly ts.Statement[], predicate: (o: any) => o is T){
  const matchedStatements = currentStatements.filter(predicate)
  const lastMatch = matchedStatements[matchedStatements.length - 1]
  const statementIndex = currentStatements.indexOf(lastMatch) + 1
  const statements = currentStatements.slice(0)
  statements.splice(statementIndex, 0, ...insertStatements)
  return statements
}
