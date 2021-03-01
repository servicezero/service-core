import { deserializeTypeFromJson } from "@service-core/runtime/type-serializer"
import {
  ICtor,
  Typ,
  getObjPath,
  getOrCreateClassDef,
  getTypeDefsForPath,
} from "@service-core/runtime/type-specification"

type IReqParams = {
  readonly [key: string]: string | readonly string[]
}

/**
 * Deserializes the given http request params into restricted type ensuring
 * value types, properties etc to guarantee the schema is met.
 * @param schema The type to deserialize into
 * @param request The http request params
 * @return Restricted json object with only supported values of the schema
 * @throws SerializationException if type definition could not be found at path
 */
export function deserializeTypeFromRequest<T>(schema: ICtor<T>, request: IReqParams = {}): T{
  const typeDef = getOrCreateClassDef(schema as any)
  // convert request into json
  const json: any = {}
  for(const [ key, value ] of Object.entries(request)){
    const { hierarchy, paths } = getTypeDefsForPath(typeDef, key)
    // create all parents
    let parent = json
    for(let i = 0, ii = paths.length; i < ii; i++){
      const key = paths[i]
      const propDef = hierarchy[i + 1]
      // if last path then set value
      if(i === ii - 1){
        // force to be an array if we know
        if((propDef?.type === Typ.Arr || propDef?.type === Typ.Set) && !Array.isArray(value)){
          parent[key] = [ value ]
        }else{
          parent[key] = value
        }
      }else if(!parent[key]){
        switch(propDef?.type){
        case Typ.Arr:
        case Typ.Set:
          parent[key] = []
          break
        default:
          parent[key] = {}
          break
        }
      }
      parent = parent[key]
    }
  }
  return deserializeTypeFromJson(schema, json)
}

/**
 * Serializes the given type into a http request params
 * @param value The value to serialize
 * @return Http request params
 */
export function serializeTypeToRequest(value: any): IReqParams{
  const params: any = {}
  const pushParam = (name: string, val: any) => {
    // force to null for json serialization
    if(val === null || val === undefined){
      val = null
    }

    if(name in params){
      const v = params[name]
      const arr = Array.isArray(v) ? v : [ v ]
      params[name] = arr
      arr.push(val)
    }else{
      params[name] = val
    }
  }

  const recursive = (val: any, name: string) => {
    if(typeof val === "bigint"){
      pushParam(name, val.toString())
    }else if(val instanceof Date){
      pushParam(name, val.toISOString())
    }else if(Array.isArray(val) || val instanceof Set){
      for(const v of val){
        recursive(v, name)
      }
    }else if(val instanceof Map){
      for(const [ k, v ] of val){
        recursive(v, getObjPath(name, k?.toString()))
      }
    }else if(typeof val === "object"){
      if(val.constructor !== Object){
        pushParam(getObjPath(name, "_typ"), val.constructor.name)
      }
      for(const [ k, v ] of Object.entries(val)){
        recursive(v, getObjPath(name, k))
      }
    }else{
      pushParam(name, val)
    }
  }
  recursive(value, "")

  return params
}
