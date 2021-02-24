import { createException } from "@service-core/runtime/exceptions"
import {
  ICtor,
  ITypeDef,
  ITypeDefEnum,
  ITypeDefEnumLiteral,
  Typ,
  getOrCreateClassDef,
  getTypeDefForPath,
} from "./type-specification"

export const SerializationException = createException("SerializationException")

function getTypOfValue(value: any, numberTyp: Typ.Float | Typ.Int = Typ.Float): Typ | string | undefined{
  switch(true){
  case value === null || value === undefined: return undefined
  case typeof value === "string": return Typ.Str
  case typeof value === "boolean": return Typ.Bool
  case typeof value === "number": return numberTyp
  case typeof value === "bigint": return Typ.BigInt
  case Array.isArray(value): return Typ.Arr
  case Buffer.isBuffer(value): return Typ.Buff
  case value instanceof Date: return Typ.Date
  case value instanceof Set: return Typ.Set
  case value instanceof Map: return Typ.Map
  case typeof value === "object": return value.constructor.name
  default: return undefined
  }
}

function findEnumValue(value: any, typeDef: ITypeDefEnum | ITypeDefEnumLiteral): bigint | number | string | undefined{
  // first look for value type
  if(typeDef.vals.has(value)){
    return value
  }
  // next look by key
  const byKey = typeDef.keys.get(value)
  if(byKey !== undefined){
    return byKey
  }
  // possible casing issue ?
  if(typeof value === "string"){
    const lv = value.toLowerCase()

    // compare by lowercase values first
    for(const v of typeDef.vals.keys()){
      // numeric enums no need to check values
      if(typeof v !== "string"){
        break
      }
      if(v.toLowerCase() === lv){
        return v
      }
    }
    // compare by lowercase keys last
    for(const k of typeDef.keys.keys()){
      if(k.toLowerCase() === lv){
        return typeDef.keys.get(k)
      }
    }
  }
  // otherwise default to value if required
  return typeDef.required ? typeDef.unmatchedValue : undefined
}

export function findEnumKey(value: any, typeDef: ITypeDefEnum | ITypeDefEnumLiteral): string | undefined{
  // first look for value type
  const key = typeDef.vals.get(value)
  if(key !== undefined){
    // with string valued enums always serialize the value
    return typeof value === "string" ? value : key
  }
  // otherwise default to value if required
  if(typeDef.required){
    return typeof typeDef.unmatchedValue === "string" ? typeDef.unmatchedValue : typeDef.vals.get(typeDef.unmatchedValue as any)
  }
  return undefined
}

export interface ICSharpClassRef{
  readonly className: string
  readonly classNameSimple: string
  readonly packageName: string
  readonly type: string
}
/**
 * c# produces serialization property for inherited types
 * as { $type: "{ Absolute Class Name }, { Absolute Package Name }" }
 * eg. { $type: "Some.Domain.Models.UnionClassA, Some.Domain.Models" }
 * This method will extract the class name
 * @param type
 */
export function getInheritanceClassNameFromType(type: string): ICSharpClassRef{
  const [ className = "", packageName = "" ] = type.split(/,\s*/gi)
  const idx = className.lastIndexOf(".")
  const classNameSimple = idx > 0 ? className.substring(idx + 1) : className
  return {
    className,
    classNameSimple,
    packageName,
    type,
  }
}

function deserializeArr(value: any){
  if(value === null || value === undefined){
    return []
  } else if(typeof value === "string"){
    return value.split(",")
  } else if(Array.isArray(value)){
    return value
  } else if(typeof value?.[Symbol.iterator] === "function"){
    return Array.from(value)
  } else{
    return [ value ]
  }
}

function deserializeTypeDefFromJson(typeDef: ITypeDef, value: any): any{
  if(!typeDef.required && (value === null || value === undefined)){
    return undefined
  }

  switch(typeDef.type){
  case Typ.Str:
    return (value ?? "").toString()
  case Typ.Int:{
    const n = Number(value ?? 0)
    return !isNaN(n) ? Math.trunc(n) : 0
  }
  case Typ.Float:{
    const n = Number(value ?? 0)
    return !isNaN(n) ? n : 0
  }
  case Typ.Bool:
    return value === true || value === "true" || value === 1 || value === "1"
  case Typ.BigInt:
    try{
      return BigInt(value ?? 0n)
    }catch(e){
      return 0n
    }
  case Typ.Buff:
    return Buffer.from((value ?? "").toString(), "base64")
  case Typ.Date:{
    const iso = value?.value ?? value ?? ""
    const d = new Date(/^\d+$/.test(iso) ? Number(iso) : iso)
    return isNaN(d.getTime()) ? new Date(0) : d
  }
  case Typ.Arr:{
    const arr = deserializeArr(value)
    arr.forEach((v, i) => {
      arr[i] = deserializeTypeDefFromJson(typeDef.valType, v)
    })
    return arr
  }
  case Typ.Set:{
    const arr = deserializeArr(value)
    return new Set(arr.map(v => deserializeTypeDefFromJson(typeDef.valType, v)))
  }
  case Typ.Map:{
    let kvs: any
    if(value instanceof Map){
      kvs = value.entries()
    }else{
      kvs = Object.entries(typeof value === "object" ? value : {})
    }
    const ret = new Map()
    for(const [ k, v ] of kvs){
      ret.set(deserializeTypeDefFromJson(typeDef.keyType, k), deserializeTypeDefFromJson(typeDef.valType, v))
    }
    return ret
  }
  case Typ.Enum:
  case Typ.EnumLiteral:{
    return findEnumValue(value, typeDef)
  }
  case Typ.Class:{
    const ret: any = new typeDef.ctor()
    for(const property of typeDef.properties){
      ret[property.name] = deserializeTypeDefFromJson(property, value?.[property.name] ?? ret[property.name])
    }
    return ret
  }
  case Typ.Union:{
    let typName: string | undefined
    // if _typ is defined then prefer that
    if(value?._typ){
      typName = value?._typ
    } else if(value?.$type){ // c# style deserialization
      typName = getInheritanceClassNameFromType(value.$type)?.classNameSimple
    } else {
      typName = getTypOfValue(value, typeDef.values[Typ.Int]?.type ?? typeDef.values[Typ.Float]?.type)
    }

    // if no type def found
    // default to first type
    const innerTypeDef = (typeDef.values[typName as any] ??
                            typeDef.values[Object.keys(typeDef.values)[0]]) as ITypeDef
    switch(innerTypeDef.type){
    case Typ.Class:
    case Typ.Date:
      return deserializeTypeDefFromJson(innerTypeDef, value)
    default:
      return deserializeTypeDefFromJson(innerTypeDef, value?.value ?? value)
    }
  }
  }
}

function serializeTypeDefToJson(typeDef: ITypeDef, value: any): any{
  if(!typeDef.required && (value === null || value === undefined)){
    return undefined
  }

  switch(typeDef.type){
  case Typ.Str:
    return (value ?? "").toString()
  case Typ.Int:{
    const n = Number(value)
    return !isNaN(n) ? Math.trunc(n) : 0
  }
  case Typ.Float:{
    const n = Number(value)
    return !isNaN(n) ? n : 0
  }
  case Typ.Bool:
    return value === true || value === "true" || value === 1 || value === "1"
  case Typ.BigInt:
    try{
      return BigInt(value).toString()
    }catch(e){
      return "0"
    }
  case Typ.Buff:{
    const buff = Buffer.isBuffer(value) ? value : Buffer.alloc(0)
    return buff.toString("base64")
  }
  case Typ.Date:{
    let d!: Date
    try{
      d = new Date(value)
    }catch(e){
      // ignore
    }
    if(!d || isNaN(d.getTime())){
      d = new Date(0)
    }
    return { unixms: d.getTime(), value: d.toISOString() }
  }
  case Typ.Arr:{
    const a = Array.isArray(value) ? value : []
    return a.map(v => serializeTypeDefToJson(typeDef.valType, v))
  }
  case Typ.Set:{
    const s = value instanceof Set ? value : new Set()
    return Array.from(s.values()).map(v => serializeTypeDefToJson(typeDef.valType, v))
  }
  case Typ.Map:{
    const vals = value instanceof Map ? value : new Map()
    const ret: any = {}
    for(const [ k, v ] of vals){
      const key = serializeTypeDefToJson(typeDef.keyType, k)
      const keyStr: string = typeof key === "object" ? key.value ?? key?.toString() : key
      ret[keyStr] = serializeTypeDefToJson(typeDef.valType, v)
    }
    return ret
  }
  case Typ.Enum:
  case Typ.EnumLiteral:{
    return findEnumKey(value, typeDef)
  }
  case Typ.Class:{
    // loop through class properties
    // and get their key / values
    const ret: any = {}
    for(const property of typeDef.properties){
      ret[property.name] = serializeTypeDefToJson(property, value?.[property.name])
    }
    return ret
  }
  case Typ.Union:{
    // find value type
    const typ = getTypOfValue(value, typeDef.values[Typ.Int]?.type ?? typeDef.values[Typ.Float]?.type)
    const innerTypeDef = typeDef.values[typ!] ?? typeDef.values[Object.keys(typeDef.values)[0]]
    const unionTyp = innerTypeDef?.type === Typ.Class ? innerTypeDef.typeName : innerTypeDef?.type
    let ret: any
    if(innerTypeDef){
      const serialized = serializeTypeDefToJson(innerTypeDef, value)
      if(serialized !== undefined){
        if(!Array.isArray(serialized) && typeof serialized === "object"){
          ret = serialized
          ret._typ = unionTyp
        }else{
          ret = { _typ: unionTyp, value: serialized }
        }
      }
    }
    return ret
  }
  }
}

/**
 * Finds the type definition for the given path in the schema.
 * @param schema The schema definition
 * @param path The path to lookup definition, can be property names,
 * array indexes, map keys, supports deeply nested paths.
 * @throws SerializationException if type definition could not be found at path
 */
export function findDef<T>(schema: ICtor<T>, path = ""){
  const typeDef = getOrCreateClassDef(schema as any)
  // find type definition at path
  const foundDef = getTypeDefForPath(typeDef, path)
  if(!foundDef){
    throw new SerializationException(`No type definition could be found in type '${ typeDef.typeName }' at path '${ path }'`)
  }
  return foundDef
}

/**
 * Deserializes the given json string into restricted type ensuring
 * value types, properties etc to guarantee the schema is met.
 * @param schema The type to deserialize into
 * @param json The json formatted string or object to deserialize. If an object
 * is defined it is expected to be a mutable object for performance.
 * @param path The root or sub path of the field we want to deserialize
 * @return Restricted json object with only supported values of the schema
 * @throws SerializationException if type definition could not be found at path
 */
export function deserializeTypeFromJson<T>(schema: ICtor<T>, json: object | string, path = ""): T{
  const foundDef = findDef(schema, path)
  return deserializeTypeDefFromJson(foundDef, typeof json === "string" ? JSON.parse(json) : json)
}

/**
 * Serializes the given type into a restricted json type ensuring
 * value types, properties etc to guarantee the schema is met.
 * @param schema The schema type to serialize
 * @param value The value of the path to serialize
 * @param path The root or sub path of the field we want to serialize
 * @return Restricted json object with only supported values of the schema
 * @throws SerializationException if type definition could not be found at path
 */
export function serializeTypeToJson<T extends object>(schema: ICtor<T>, value: any, path = ""): any{
  const foundDef = findDef(schema, path)
  return serializeTypeDefToJson(foundDef, value)
}
