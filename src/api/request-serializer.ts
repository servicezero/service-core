import { deserializeTypeFromJson } from "@service-core/runtime/type-serializer"
import {
  ICtor,
  IPropDef,
  Typ,
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
export function deserializeTypeFromRequest<T>(schema: ICtor<T>, request: IReqParams): T{
  const typeDef = getOrCreateClassDef(schema as any)
  // convert request into json
  const json: any = {}
  for(const [ key, value ] of Object.entries(request)){
    const { def, hierarchy } = getTypeDefsForPath(typeDef, key)
    if(def){
      // create all parents
      let parent = json
      for(const hDef of hierarchy.slice(1)){
        const propDef = hDef as IPropDef
        if(propDef === def){
          parent[propDef.name] = value
        }else if(!parent[propDef.name]){
          switch(propDef.type){
          case Typ.Arr:
          case Typ.Set:
            parent[propDef.name] = []
            break
          case Typ.Class:
          case Typ.Map:
          default:
            parent[propDef.name] = {}
            break
          }
        }
        parent = parent[propDef.name]
      }
    }
  }
  return deserializeTypeFromJson(schema, json)
}

/**
 * Serializes the given type into a http request
 * @param schema The schema type to serialize
 * @param value The value of the path to serialize
 * @return Http request params
 */
function serializeTypeToRequest<T extends object>(schema: ICtor<T>, value: any): IReqParams{
  // const foundDef = findDef(schema, path)
  // return serializeTypeDefToJson(foundDef, value)
  return {}
}
