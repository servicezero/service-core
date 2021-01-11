import ts from "typescript"
import path from "path"
import {
  TypeRef, jsToAst,
} from "./typescript-ast-converter"
import {
  IImportName,
  createMissingImports,
  getAllImportReferences,
  getPropertyName,
  getTypeArgumentNodes,
  isClassMethodLike,
  isLiteralType,
  isNullableTypeNode,
  isPropertyWithName,
  isPublic,
  mergeStatements,
  propertyToTypeNode,
  resolveOriginalSymbol,
  valueOfLiteralType,
} from "./typescript-ast-utils"
import type { ITransformHelpers } from "./typescript-transformer-plugins"

/**
 * Copied from @service-core/runtime/type-specification
 * So transformer is not reliant on enum
 */
enum Typ{
  Arr = "Arr",
  BigInt = "BigInt",
  Bool = "Bool",
  Buff = "Buff",
  Class = "Class",
  Date = "Date",
  Enum = "Enum",
  EnumLiteral = "EnumLiteral",
  Float = "Float",
  Int = "Int",
  Map = "Map",
  Set = "Set",
  Str = "Str",
  Union = "Union",
}

export interface ITypeSpecificationTransformerOptions{
    readonly fileNameMatcher: string
    readonly staticClassName: string
}

const defaultOptions: ITypeSpecificationTransformerOptions = {
  fileNameMatcher: "(domain|model|message|event|config)",
  staticClassName: "class",
}

const isNotUndefined = <T>(o: T): o is NonNullable<T> => !(o === null || o === undefined)

const withOptional = (optional: boolean) => (spec: any): any => {
  if(!optional){
    return spec
  }
  return Array.isArray(spec) ? [ true, ...spec ] : [ true, spec ]
}

function resolvePropertySymbols(typeChecker: ts.TypeChecker, props: readonly ts.Symbol[]): ts.Symbol[]{
  return props
    .filter(p => !isClassMethodLike(p.getDeclarations()?.[0] as any))
    .filter(p => isPublic(p.getDeclarations()?.[0] as any))
    .map(resolveOriginalSymbol(typeChecker))
    .filter(isNotUndefined)
}

const collectionTypes = {
  Array:         Typ.Arr,
  Map:           Typ.Map,
  ReadonlyArray: Typ.Arr,
  ReadonlyMap:   Typ.Map,
  ReadonlySet:   Typ.Set,
  Set:           Typ.Set,
}

/**
 * if is aliased symbol imported then will have
 * a parent symbol property on the object
 * if so add as absolute module path
 */
function getAbsoluteTypeRef(type: ts.Type){
  if((type.symbol as any)?.parent?.name){
    return `${ JSON.parse((type.symbol as any).parent.name) }::${ type.symbol.name }`
  }else{
    return type.symbol.name
  }
}

function resolveTypes(typeChecker: ts.TypeChecker, propertyType: ts.Type, property: ts.Symbol){
  const propertyTypeNode = propertyToTypeNode(property)
  const isOptionalProperty = !!(property.flags & ts.SymbolFlags.Optional)
  const requiredImportRefs = new Set<string>()

  const recursive = (typeReq: ts.Type, typeNode?: ts.TypeNode, optional = false, previousInterfaces: Set<string> = new Set()): any => {
    const isOptional = optional || !!(typeNode && isNullableTypeNode(typeNode))
    const opt = withOptional(isOptional)
    let type = typeReq
    // special case for enum
    if(typeReq.isUnion()){
      type = typeChecker.getNonNullableType(typeReq)
    }
    const widenedType = typeChecker.getWidenedType(type)

    // Enums
    if(type.flags & (ts.TypeFlags.EnumLiteral | ts.TypeFlags.EnumLike)){
      requiredImportRefs.add(getAbsoluteTypeRef(type))
      return opt([
        Typ.Enum,
        new TypeRef(type.symbol.name),
      ])
    } else if(type.flags & ts.TypeFlags.Boolean){
      // Boolean
      return opt(Typ.Bool)
    } else if(type.isUnion() && type.types.every(isLiteralType)){
      // Enum Literals
      return opt([
        Typ.EnumLiteral,
        type.types.map(valueOfLiteralType(typeChecker)),
      ])
    } else if(isLiteralType(type)){
      // Single Enum Literal
      return opt([
        Typ.EnumLiteral,
        [ valueOfLiteralType(typeChecker)(type) ],
      ])
    } else if(type.isUnion()){
      // Unions
      const typeNodes = typeNode && ts.isUnionTypeNode(typeNode) ? typeNode.types : undefined
      // search for boolean literals
      // can happen because typescript converts union with boolean into false | true
      // const booleanLiteralTypes = type.types.filter(t => !!(t.flags & ts.TypeFlags.BooleanLiteral))
      // const hasBooleanType = booleanLiteralTypes.length > 1
      if(typeNodes){
        const types = typeNodes.map(t => recursive(typeChecker.getTypeFromTypeNode(t), t, false, previousInterfaces))
        // flatten deep unions
        const unionTypes: any[] = []
        const recursiveUnion = (par: any): any => {
          if(Array.isArray(par) && par[0] === Typ.Union){
            par.slice(1).forEach(recursiveUnion)
          }else{
            unionTypes.push(par)
          }
        }
        types.forEach(recursiveUnion)

        return opt([
          Typ.Union,
          ...unionTypes,
        ])
      }

      return opt([
        Typ.Union,
        ...type.types.map((t, i) => recursive(t, typeNodes?.[i], false, previousInterfaces)),
      ])
    } else if(collectionTypes.hasOwnProperty(widenedType?.symbol?.name)){
      // Collections
      const elementTypeNodes = typeNode ? getTypeArgumentNodes(typeNode, true) : undefined
      const resolvedType = typeChecker.getTypeArguments(widenedType as ts.TypeReference)
      return opt([
        (collectionTypes as any)[widenedType?.symbol?.name],
        ...resolvedType.map((t, i) => recursive(t, elementTypeNodes?.[i], false, previousInterfaces)),
      ])
    } else if(widenedType?.symbol?.name === "Date"){
      // Date
      return opt(Typ.Date)
    } else if(widenedType?.symbol?.name === "Buffer"){
      // Buffer
      return opt(Typ.Buff)
    } else if(type.flags & ts.TypeFlags.StringLike){
      // String
      return opt(Typ.Str)
    } else if(!!(type.flags & ts.TypeFlags.NumberLike) && typeNode?.getText() === "int"){
      // Int
      return opt(Typ.Int)
    } else if(type.flags & ts.TypeFlags.NumberLike){
      // Float
      return opt(Typ.Float)
    } else if(type.flags & ts.TypeFlags.BigIntLike){
      // BigInt
      return opt(Typ.BigInt)
    } else if(type.isClass()){
      // Classes
      requiredImportRefs.add(getAbsoluteTypeRef(type))
      return opt(new TypeRef(type.symbol.name))
    } else if(type.isClassOrInterface() && !previousInterfaces.has(type.symbol.name)){
      // Interfaces
      if(typeNode){
        const nextInterfaces = new Set(previousInterfaces)
        nextInterfaces.add(type.symbol.name)
        const interfaceType = typeChecker.getTypeAtLocation(typeNode)
        const props = resolvePropertySymbols(typeChecker, interfaceType.getProperties())
        const retSpec: any = {}
        for(const prop of props){
          const propType = typeChecker.getTypeOfSymbolAtLocation(prop, typeNode)
          const propTypeNode = propertyToTypeNode(prop)
          const propSpec = recursive(propType, propTypeNode, !!(prop.flags & ts.SymbolFlags.Optional), nextInterfaces)
          retSpec[prop.name] = propSpec
        }
        return opt({
          class: retSpec,
          name:  type.symbol.name,
        })
      }
    }
  }

  const spec = recursive(propertyType, propertyTypeNode, isOptionalProperty)
  return {
    requiredImportRefs,
    spec,
  }
}

interface IModulePathMatch{
  readonly moduleName: string
  readonly modulePath: string
}
interface IModulePaths{
  readonly mappings: Map<string, string>
  findModuleName(filePath: string): IModulePathMatch | undefined
}

function resolveModulePaths({ paths, baseUrl = "." }: ts.CompilerOptions): IModulePaths{
  const projectRelativePathsToModuleName = new Map()
  const rootDir = path.normalize(path.resolve(baseUrl))

  // paths to module names
  if(paths){
    for(const [ modulePath, srcPaths ] of Object.entries(paths)){
      const moduleName = modulePath.replace("/*", "")
      const relPaths = srcPaths.map(s => s.replace("*", ""))
      for(let relPath of relPaths){
        if(!relPath.endsWith("/")){
          relPath += "/"
        }
        projectRelativePathsToModuleName.set(path.resolve(rootDir, relPath), moduleName)
      }
    }
  }
  // sort by length of path
  const entries = Array.from(projectRelativePathsToModuleName.entries())
  const mappings = new Map(entries.sort((o1, o2) => o2[0].length - o1[0].length))
  return {
    findModuleName(filePath: string){
      for(const [ dir, moduleName ] of mappings.entries()){
        if(filePath.startsWith(dir)){
          return {
            moduleName,
            modulePath: `${ moduleName }/${ filePath.replace(dir, "") }`.replace(/\/+/, "/"),
          }
        }
      }
    },
    mappings,
  }
}

interface IClassParsed{
    readonly name: string
    readonly spec: any // is an IClassSpec, but avoiding bringing in as dependency
}

export default function(typeChecker: ts.TypeChecker, options: Partial<ITypeSpecificationTransformerOptions>, helpers?: ITransformHelpers): ts.CustomTransformers{
  const opts = { ...defaultOptions, ...options }
  const parseSpecs = new Map<string, Map<string, IClassParsed>>()
  const parseFileImports = new Map<string, Map<string, IImportName[]>>()

  return {
    after: [
      context => {
        const { factory } = context
        const visitor: ts.Visitor = node => {
          if(ts.isClassDeclaration(node)){
            const origNode = ts.getOriginalNode(node) as ts.ClassDeclaration
            const parsed = parseSpecs.get(origNode.getSourceFile().fileName)!.get(origNode.name?.text!)
            if(parsed){
              const classProp = factory.createPropertyDeclaration(undefined,
                factory.createModifiersFromModifierFlags(ts.ModifierFlags.Static),
                "class",
                undefined,
                undefined,
                jsToAst(factory, parsed.spec),
              )
              const prevMembers = node.members.filter(m => !m.name || getPropertyName(m.name as any) !== "class")
              return factory.updateClassDeclaration(
                node,
                node.decorators,
                node.modifiers,
                node.name,
                node.typeParameters,
                node.heritageClauses,
                [ classProp, ...prevMembers ])
            }
            return node
          }
          const srcFile = ts.visitEachChild(node, visitor, context)
          // add missing imports
          if(ts.isSourceFile(srcFile)){
            const specifiers = parseFileImports.get(srcFile.fileName)
            if(specifiers){
              const inScopeSymbols = typeChecker.getSymbolsInScope(node, ts.SymbolFlags.Class | ts.SymbolFlags.Enum)
              const filteredSpecifiers = new Map()
              for(const [ moduleSpecifier, imps ] of specifiers){
                // ignore symbol if already in scope
                const filteredImps = imps.filter(imp => !inScopeSymbols.some(s => s.name === imp.name))
                if(filteredImps.length){
                  filteredSpecifiers.set(moduleSpecifier, filteredImps)
                }
              }
              const importDecls = createMissingImports(factory, srcFile, filteredSpecifiers)
              // only modify if inserting imports
              if(importDecls.length){
                const statements = mergeStatements(srcFile.statements, importDecls, ts.isImportDeclaration)
                return factory.updateSourceFile(srcFile,
                  statements, srcFile.isDeclarationFile,
                  srcFile.referencedFiles, srcFile.typeReferenceDirectives,
                  srcFile.hasNoDefaultLib, srcFile.libReferenceDirectives)
              }
            }
          }
          return srcFile
        }
        return node => visitor(node) as ts.SourceFile
      },
    ],
    before: [
      context => {
        const modulePaths = resolveModulePaths(context.getCompilerOptions())
        const visitor: ts.Visitor = node => {
          if(ts.isSourceFile(node)){
            parseFileImports.set(node.fileName, new Map())
            parseSpecs.set(node.fileName, new Map())
          }else if(ts.isClassDeclaration(node)){
            // if statically defined the class spec
            // and has been initialised then ignore
            // otherwise generate based on class introspection
            const classProperty = node.members.find(isPropertyWithName(opts.staticClassName, true))
            // matches file name ??
            const matchesFileName = new RegExp(opts.fileNameMatcher, "i").test(node.getSourceFile().fileName)
            // no need to process class
            if(!(classProperty || matchesFileName) || classProperty?.initializer || !node.name)return node
            // Find all import references for lookups
            const importRefs = getAllImportReferences(node.getSourceFile())
            const parsed: IClassParsed = {
              name: node.name.text,
              spec: {},
            }
            parseSpecs.get(node.getSourceFile().fileName)!.set(node.name.text, parsed)
            const fileImports = parseFileImports.get(node.getSourceFile().fileName)!
            // introspect class properties
            const type = typeChecker.getTypeAtLocation(node)
            const props = resolvePropertySymbols(typeChecker, type.getProperties())

            for(const prop of props){
              const propType = typeChecker.getTypeOfSymbolAtLocation(prop, node)
              const { requiredImportRefs, spec } = resolveTypes(typeChecker, propType, prop)

              // assign import refs
              for(const ref of requiredImportRefs){
                let imp = importRefs.get(ref)
                if(!imp && /[^:]+::[^:]+/.test(ref)){
                  const [ moduleSpecifier, name ] = ref.split("::")
                  const resolvedSpecifier = modulePaths.findModuleName(moduleSpecifier)?.modulePath ?? moduleSpecifier
                  imp = {
                    moduleSpecifier: resolvedSpecifier,
                    name,
                  }
                }
                if(imp){
                  const imps = fileImports.get(imp.moduleSpecifier) ?? []
                  if(!imps.some(i => i.name === imp!.name)){
                    imps.push(imp)
                  }
                  fileImports.set(imp.moduleSpecifier, imps)
                }
              }
              // assign property
              parsed.spec[prop.name] = spec
            }
          }
          return ts.visitEachChild(node, visitor, context)
        }
        return node => visitor(node) as ts.SourceFile
      },
    ],
  }
}
