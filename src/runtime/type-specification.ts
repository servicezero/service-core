export type int = number

type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}


export interface ICtor<T>{
  new (...args: any[]): T
}

export type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never

// IEnsureBool fix for booleans changing to false | true
export type IEnsureBool<T> = T extends boolean ? boolean : T
export type UnionToTuple<T> = UnionToIntersection<(T extends any ? (t: T) => T : never)> extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, IEnsureBool<W>>>, IEnsureBool<W>]
  : [];

export type IIsUnion<T> = UnionToTuple<NonNullable<T>>["length"] extends 1 ? false : true

/**
 * Currently there is a limitation with typescript enums
 * and detecting them generically. We have a solution that works for
 * string enums if the names and values are equal, but for numeric enums or string enums
 * where names and values differ we cannot create a restraint. As a workaround the recommendation
 * is to just use string enums. If however you still want to use numeric enum and ensure
 * type safety you have to create a workaround using namespaces to correctly constrain the type.
 * Workaround for enums if to define __enum property with same type as enum.
 * ```typescript
 * namespace EnumA{ export declare const __enum: EnumA }
 * enum EnumA{
 *  A = 0,
 *  B = 1,
 * }
 * ```
 */
export interface IEnumConstraint<T>{
  readonly __enum: T
}
type IStrEnum<T extends string | symbol> = { readonly
  [P in T]: P
}
const __never__ = Symbol()
export type IEnum<T> = IEnumConstraint<T> | IStrEnum<T extends string ? T : typeof __never__>

export type ITail<T extends any[]> = T extends [any, ...infer R] ? R : never

// export type IMapTuple<T extends any[], R, B extends any[] = []> = T extends [infer U, ...unknown[]]
//   ? IMapTuple<ITail<T>, R, [...B, R]>
//   : B

// type INullablePromise<T> = [T] extends [NonNullable<T>]
//   ? T extends Promise<infer A> ? A : never
//   : NonNullable<T> extends Promise<infer A> ? A | undefined : never

// export type IPromiseTuple<A, B extends any[] = []> = A extends [infer U, ...unknown[]]
//   ? IPromiseTuple<ITail<A>, [...B, INullablePromise<U>]>
//   : B


export enum Typ{
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

export enum Serializer{
  /**
   * Value serialized into simple string in single field.
   * This is most useful when Set, Map or Array types use primitives
   * for keys and values.
   */
  Simple = "Simple",
  /**
   * Value serialized into structured json in single field.
   * This is most useful when only modifying the field and never
   * needing to modify it's nested objects independently.
   */
  Json = "Json",
}

const isSimpleTyp = (type: Typ) => type === Typ.Str
                                   || type === Typ.Int
                                   || type === Typ.Float
                                   || type === Typ.BigInt
                                   || type === Typ.Bool
                                   || type === Typ.Date

export interface ICtorSchema<T>{
  readonly class: IClassSpec<T>
  new (...args: any[]): T
}

type IUnionTypeSpec<T extends any[], B extends any[] = []> =
  T extends [infer U, ...unknown[]] ? IUnionTypeSpec<ITail<T>, [...B, ITypeSpec<U>]> : B

type ISimpleKey<T extends Date | bigint | boolean | number | string | undefined> = T

type ITypeSpec<T> =
  IIsUnion<T> extends true ? [Typ.Enum, IEnum<T>, T?] | [Typ.EnumLiteral, UnionToTuple<T>] | [Typ.Union, ...IUnionTypeSpec<UnionToTuple<T>>]
  : T extends ReadonlyMap<ISimpleKey<infer K>, infer V> ? [Typ.Map, IClassSpecType<K>, IClassSpecType<V>, Serializer?]
  : T extends ReadonlySet<ISimpleKey<infer V>> ? [Typ.Set, IClassSpecType<V>, Serializer?]
  : T extends ReadonlyArray<infer V> ? [Typ.Arr, IClassSpecType<V>, Serializer?]
  : T extends Buffer ? Typ.Buff
  : T extends Date ? Typ.Date
  : T extends boolean ? Typ.Bool
  : T extends bigint ? Typ.BigInt
  : T extends number ? Typ.Float | Typ.Int
  : T extends string ? Typ.Str
  : IPlainObject<T> extends object ? ICtor<T>
  : never

type IWithOptional<T> = T extends any[] ? [true, ...T] : [true, T]
type IClassSpecType<T> = [T] extends [NonNullable<T>] ? ITypeSpec<NonNullable<T>> : IWithOptional<ITypeSpec<NonNullable<T>>>

export type IClassSpec<T> = {
  readonly [P in keyof T]-?: IClassSpecType<T[P]>
}

const objectNever: unique symbol = Symbol()
type IObjectNever = typeof objectNever

export type IPlainObject<T> =
  T extends { readonly [Symbol.iterator]: any } ? IObjectNever
  : T extends Date ? IObjectNever
  : T extends object ? T
  : IObjectNever

interface ITypeDefBase{
  readonly required: boolean
}

type ISimpleTyp = Typ.BigInt | Typ.Bool | Typ.Date | Typ.Float | Typ.Int | Typ.Str
type IPrimTyp = ISimpleTyp | Typ.Buff

export interface ITypeDefPrimitive<T extends IPrimTyp = IPrimTyp> extends ITypeDefBase{
  readonly type: T
}

export interface ITypeDefArr extends ITypeDefBase{
  readonly serializer: Serializer
  readonly type: Typ.Arr
  readonly typeRegistry: IClassDefRegistry
  readonly valType: ITypeDef
}

export interface ITypeDefSet extends ITypeDefBase{
  readonly serializer: Serializer
  readonly type: Typ.Set
  readonly typeRegistry: IClassDefRegistry
  readonly valType: ITypeDefPrimitive<ISimpleTyp>
}

export interface ITypeDefMap extends ITypeDefBase{
  readonly keyType: ITypeDefPrimitive<ISimpleTyp>
  readonly serializer: Serializer
  readonly type: Typ.Map
  readonly typeRegistry: IClassDefRegistry
  readonly valType: ITypeDef
}

export interface ITypeDefEnumBase<T extends bigint | number | string> extends ITypeDefBase{
  readonly keys: ReadonlyMap<string, T>
  readonly unmatchedValue: T
  readonly vals: ReadonlyMap<T, string>
}

export interface ITypeDefEnum extends ITypeDefEnumBase<number | string>{
  readonly enum: object
  readonly type: Typ.Enum
}

export interface ITypeDefEnumLiteral extends ITypeDefEnumBase<any>{
  readonly type: Typ.EnumLiteral
}

export interface ITypeDefUnion extends ITypeDefBase{
  readonly type: Typ.Union
  readonly values:
    {
      readonly [P in Typ]?: ITypeDefOfTyp<P>
    } & {
      readonly [type: string]: ITypeDefClass
    }
}

export interface ITypeDefClass<T = unknown> extends ITypeDefBase{
  readonly ctor: ICtorSchema<T>
  readonly properties: readonly IPropDef[]
  readonly propertiesByName: {
    readonly [key: string]: IPropDef
  }
  readonly type: Typ.Class
  readonly typeName: string
}

export type ITypeDef = ITypeDefArr | ITypeDefClass | ITypeDefEnum | ITypeDefEnumLiteral | ITypeDefMap | ITypeDefPrimitive | ITypeDefSet | ITypeDefUnion

export type ITypeDefOfTyp<T extends Typ> =
  T extends Typ.Class ? ITypeDefClass
  : T extends Typ.Enum ? ITypeDefEnum
  : T extends Typ.EnumLiteral ? ITypeDefEnumLiteral
  : T extends Typ.Union ? ITypeDefUnion
  : T extends Typ.Map ? ITypeDefMap
  : T extends Typ.Set ? ITypeDefSet
  : T extends Typ.Arr ? ITypeDefArr
  : T extends IPrimTyp ? ITypeDefPrimitive<T>
  : never

export type IPropDef = ITypeDef & { readonly name: string }

export type IClassDefRegistry = Map<string, ITypeDefClass<any>>

//
// Type paths
//

type IFindValueType<T, K> =
  K extends "." ? T
  : NonNullable<T> extends ReadonlyMap<infer MK, infer MV> ? MV
  : NonNullable<T> extends ReadonlyArray<infer E> ? IFindValueType<E, K>
  : K extends "" ? T
  : K extends keyof T ? T[K]
  : K extends `${ infer A }[${ number }]${ infer B }` ? IFindValueType<IFindValueType<T, A>, B>
  : K extends `${ infer A }['${ infer B }']${ infer C }` ? A extends "" ? IFindValueType<T, B> : IFindValueType<IFindValueType<IFindValueType<T, A>, B>, C>
  : K extends `${ infer A }.${ infer B }` ? IFindValueType<IFindValueType<T, A>, B>
  : never

type IEscKey<K extends string, PK extends string> = K extends `${ string }.${ string }` ? `${ PK }['${ K }']` : PK extends "" ? K : `${ PK }.${ K }`
type INestedTypeKeysStatic<T, PK extends string> = { readonly
  [K in keyof T]: ITypeKeysStatic<T[K], IEscKey<K & string, PK>>
}
type ITypeKeysStatic<T, PK extends string = ""> =
  NonNullable<T> extends ReadonlyMap<infer K, infer V> ? ITypeKeysStatic<V, `${ PK }['__MapKey__']`> | `${ PK }['__MapKey__']`
    : NonNullable<T> extends ReadonlyArray<infer E> ? ITypeKeysStatic<E, `${ PK }[000000000]`> | `${ PK }[000000000]`
    : IPlainObject<NonNullable<T>> extends object ? IEscKey<string & (keyof T), PK> | INestedTypeKeysStatic<T, PK>[keyof INestedTypeKeysStatic<T, PK>]
      : never

type IFixKeys<K> =
  K extends `${ infer A }['__MapKey__']${ infer B }` ? `${ IFixKeys<A> }['${ string }']${ IFixKeys<B> }`
    : K extends `${ infer A }[000000000]${ infer B }` ? `${ IFixKeys<A> }[${ number }]${ IFixKeys<B> }`
    : K

type ITypeKeys<T> = IFixKeys<ITypeKeysStatic<T>>
type IExtendsType<A, B, K> = A extends never ? never : A extends B ? K : never
type IDistributeTypeKeys<T, K, Types, ExcludeTypes = never> = K extends any ? IExtendsType<Exclude<IFindValueType<T, K>, ExcludeTypes>, Types, K> : never
export type IDeepTypeKeys<T> = "." | NonNullable<ITypeKeys<T>> & string
export type IDeepTypeKeysByType<T, Types, ExcludeTypes = never> = IFixKeys<IDistributeTypeKeys<T, NonNullable<ITypeKeysStatic<T>>, Types, ExcludeTypes>>
export type IDeepTypeStringKeys<T> = IDeepTypeKeysByType<T, string>
export type IDeepTypeNumberKeys<T> = IDeepTypeKeysByType<T, bigint | number>
export type IDeepTypeArrayKeys<T> = IDeepTypeKeysByType<T, readonly any[]>
export type IDeepTypeObjectKeys<T> = IDeepTypeKeysByType<T, ReadonlyMap<any, any> | Record<any, any>, ReadonlyArray<any> | ReadonlySet<Date | bigint | boolean | number | string>>
export type IValue<T, K> = IFindValueType<T, K>
export type IKeyValue<T, K> = K extends any ? readonly [key: K, value: IFindValueType<T, K>] : never
export type IValues<T, K extends readonly any[], V extends readonly any[] = []> = K extends readonly [infer A, ...infer B] ? IValues<T, B, [ ...V, IValue<T, A>]> : V
export type IArrayElementValue<T> = T extends ReadonlyArray<infer A> ? A : never


//
// Implementation
//

const isNumEnum = (k: number | string) => typeof k === "number" || /^\d+$/.test(k)

function createTypeDefEnum<T extends object>(required: boolean, type: T, def?: any): ITypeDefEnum{
  const keys = new Map()
  const vals = new Map()
  let unmatchedValue: any = def
  for(const k of Object.keys(type)){
    // ignore numeric values as they are not keys
    if(isNumEnum(k))continue
    const v = (type as any)[k]
    keys.set(k, v)
    vals.set(v, k)
    // set first value if not defined
    if(unmatchedValue === undefined){
      unmatchedValue = v
    }
  }
  return {
    enum: type,
    keys,
    required,
    type: Typ.Enum,
    unmatchedValue,
    vals,
  }
}
function enumLiteralToStr(value: bigint | number | string): string{
  return typeof value === "bigint" ? `${ value.toString() }n` : value.toString()
}
function createTypeDefEnumLiteral(required: boolean, values: (bigint | number | string)[]): ITypeDefEnumLiteral{
  const keys = new Map()
  const vals = new Map()
  for(const v of values){
    const k = enumLiteralToStr(v)
    keys.set(k, v)
    vals.set(v, k)
  }
  return {
    keys,
    required,
    type:           Typ.EnumLiteral,
    unmatchedValue: values[0],
    vals,
  }
}

/**
 * Workaround for enum type constraints in typescript since
 * currently no check to see if generic type extends enum.
 * @param enumType The enum object
 */
export function asEnum<T>(enumType: T): IEnumConstraint<T[keyof T]>{
  return enumType as any
}
export function isCtorSchema(value: any): value is ICtorSchema<unknown>{
  return typeof value === "function" && value.toString().startsWith("class ") && value.class !== null && value.class !== undefined && typeof value.class === "object"
}
function getSerializer(valType: ITypeDef, keyType?: ITypeDef, serializer?: unknown): Serializer{
  switch(serializer){
  case Serializer.Simple:
  case Serializer.Json:
    return serializer
  default:{
    let ser = Serializer.Json
    if(isSimpleTyp(valType.type) && (!keyType || isSimpleTyp(keyType.type))){
      ser = Serializer.Simple
    }
    return ser
  }
  }
}

function classSpecToPropDefs(spec: any, required = true, reg = new Map<ICtorSchema<unknown>, ITypeDefClass>(), nestedTypeRegistry?: Map<string, ITypeDefClass<any>>): ITypeDef{
  if(Array.isArray(spec)){
    const required = !(spec[0] === true)
    const type = spec[required ? 0 : 1]
    // check type
    switch(type){
    case Typ.Union:{
      const values = spec.slice(required ? 1 : 2)
        .map(s => classSpecToPropDefs(s, true, reg, nestedTypeRegistry))
        .map(def => [ def.type === Typ.Class ? def.typeName : def.type, def ])
      return { required, type: Typ.Union, values: Object.fromEntries(values) } as ITypeDefUnion
    }
    case Typ.Arr:
    case Typ.Set:{
      const typeRegistry = new Map<string, ITypeDefClass<any>>()
      const valType = classSpecToPropDefs(spec[required ? 1 : 2], true, reg, typeRegistry)
      const serializer = getSerializer(valType, undefined, spec[2])
      return { required, serializer, type, typeRegistry, valType } as (ITypeDefArr | ITypeDefSet)
    }
    case Typ.Map:{
      const typeRegistry = new Map<string, ITypeDefClass<any>>()
      const keyType = classSpecToPropDefs(spec[required ? 1 : 2], true, reg, typeRegistry)
      const valType = classSpecToPropDefs(spec[required ? 2 : 3], true, reg, typeRegistry)
      const serializer = getSerializer(valType, keyType, spec[3])
      return { keyType, required, serializer, type, typeRegistry, valType } as ITypeDefMap
    }
    case Typ.Enum:{
      return createTypeDefEnum(required, spec[required ? 1 : 2], spec[required ? 2 : 3])
    }
    case Typ.EnumLiteral:{
      const values = spec[required ? 1 : 2] as (bigint | number | string)[]
      return createTypeDefEnumLiteral(required, values)
    }
    default:{
      return classSpecToPropDefs(type, required, reg, nestedTypeRegistry)
    }
    }
  }else if(isCtorSchema(spec)){
    const existingDef = reg.get(spec)
    if(existingDef !== undefined){
      const ret = { ...existingDef, required }
      if(nestedTypeRegistry){
        nestedTypeRegistry.set(ret.typeName, ret)
      }
      return ret
    }
    // first create an entry to add into registry
    // to handle recursion references
    const properties: IPropDef[] = []
    const classDef: Mutable<ITypeDefClass> = { ctor: spec, properties, propertiesByName: {}, required, type: Typ.Class, typeName: spec.name }
    reg.set(spec, classDef)

    const innerDef: any = classDef.propertiesByName
    for(const [ key, prop ] of Object.entries(spec.class)){
      const typeDef = classSpecToPropDefs(prop, true, reg, nestedTypeRegistry) as Mutable<IPropDef>
      typeDef.name = key
      innerDef[key] = typeDef
      properties.push(typeDef)
    }
    // order properties by length
    properties.sort((p1, p2) => p2.name.length - p1.name.length)
    if(nestedTypeRegistry){
      nestedTypeRegistry.set(classDef.typeName, classDef)
    }
    return classDef
  }else{
    return { required, type: spec as any } as ITypeDefPrimitive
  }
}

function classToClassDef<T>(ctor: ICtorSchema<T>): ITypeDefClass<T>{
  return classSpecToPropDefs(ctor) as ITypeDefClass<T>
}

function locateTypeDefByPath(typeDef: ITypeDef, part: string): ITypeDef | undefined{
  switch(typeDef.type){
  case Typ.Class:
    return typeDef.propertiesByName[part]
  case Typ.Arr:
  case Typ.Map:
    return typeDef.valType
  case Typ.Union:
    // if nested in union then first look for arrays
    if(/^\d+$/.test(part)){
      return typeDef.values[Typ.Arr]?.valType
    }
    // then look for class types
    for(const [ key, innerDef ] of Object.entries(typeDef.values)){
      if(!(key in Typ)){
        const found = locateTypeDefByPath(innerDef, part)
        if(found){
          return found
        }
      }
    }
    // then look for maps
    return typeDef.values[Typ.Map]?.valType
  }
}

const rootTypeRegistry = new Map<ICtorSchema<unknown>, ITypeDefClass>()

/**
 * Get's the key / value path for the nested path. If property name
 * contains "." then property name will be wrapped safely as "['${ propertyName }']".
 * @param currentPath The current path of parent
 * @param propertyName The child property
 */
export function getObjPath(currentPath: string, propertyName: string){
  return propertyName.includes(".")
    ? `${ currentPath }['${ propertyName }']`
    : `${ currentPath }${ currentPath.length > 0 ? "." : "" }${ propertyName }`
}

/**
 * Creates a type definition for the given class
 * @param schema The class constructor to create type definition for
 */
export function getOrCreateClassDef<T>(schema: ICtorSchema<T>): ITypeDefClass<T>{
  if(rootTypeRegistry.has(schema)){
    return rootTypeRegistry.get(schema) as any
  }
  const typeDef = classToClassDef(schema)
  rootTypeRegistry.set(schema, typeDef)
  return typeDef
}

/**
 * Attempts to find matching type definition for the given path. This is mostly useful
 * when deserializing string values into specific types
 * @param rootTypeDef The root type definition
 * @param path The path to look for nested type definition or "." for root definition
 */
export function getTypeDefForPath(rootTypeDef: ITypeDef, path: string){
  if(path === ""){
    return rootTypeDef
  }
  let typeDef: ITypeDef | undefined = rootTypeDef
  let part = ""
  let inBrackets = false
  let inQuotes = false

  const nextDef = () => {
    if(!part)return
    typeDef = typeDef ? locateTypeDefByPath(typeDef, part) : undefined
    part = ""
  }

  for(let i = 0, ii = path.length; i < ii; i++){
    // stop processing if no type def
    if(!typeDef){
      break
    }
    const c = path[i]
    switch(true){
    case !inQuotes && c === "[":
      nextDef()
      inBrackets = true
      if(path[i + 1] === "'"){
        inQuotes = true
        i++
      }
      continue
    case inQuotes && c === "'" && path[i + 1] === "]":
      nextDef()
      inQuotes = false
      inBrackets = false
      i++
      continue
    case !inQuotes && (c === "]" || c === "."):
      nextDef()
      inBrackets = false
      continue
    }
    part += c
  }
  nextDef()

  return typeDef
}
