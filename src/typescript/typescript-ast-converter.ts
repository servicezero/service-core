import ts from "typescript"

export class TypeRef{
  constructor(readonly identifier: string){}
}

function isTsNode(o: any): o is ts.Node{
  return o !== null && o !== undefined && typeof o === "object" && ("kind" in o) && !!ts.SyntaxKind[o.kind]
}

function getObjectPropName(factory: ts.NodeFactory, name: string): ts.PropertyName{
  if(/^[a-z]([a-z_0-9]+)?$/i.test(name)){
    return factory.createIdentifier(name)
  }else{
    return factory.createStringLiteral(name)
  }
}

export function jsToAst(factory: ts.NodeFactory, rootObj: any, multiline = false): ts.Expression{
  const recursive = (obj: any): any => {
    if(obj === null || obj === undefined){
      return factory.createIdentifier("undefined")
    }
    if(isTsNode(obj)){
      return obj as any
    }

    if(Array.isArray(obj)){
      return factory.createArrayLiteralExpression(obj.map(recursive), multiline)
    }else if(obj instanceof Map){
      return factory.createNewExpression(factory.createIdentifier("Map"), undefined, Array.from(obj.entries()).map(recursive))
    }else if(obj instanceof Set){
      return factory.createNewExpression(factory.createIdentifier("Set"), undefined, Array.from(obj.values()).map(recursive))
    }else if(obj instanceof Date){
      return factory.createNewExpression(factory.createIdentifier("Date"), undefined, [ factory.createNumericLiteral(obj.getTime()) ])
    }else if(obj instanceof TypeRef){
      return factory.createIdentifier(obj.identifier)
    }else{
      switch(typeof obj){
      case "string":{
        if(/[\r\n"']+/gi.test(obj)){
          return factory.createNoSubstitutionTemplateLiteral(obj)
        }else{
          return factory.createStringLiteral(obj)
        }
      }
      case "number":{
        return factory.createNumericLiteral(obj)
      }
      case "boolean":{
        return obj ? factory.createTrue() : factory.createFalse()
      }
      case "bigint":{
        return factory.createBigIntLiteral({
          base10Value: obj.toString().replace("-", ""),
          negative:    obj < 0n,
        })
      }
      case "object":{
        // create properties
        const properties: ts.ObjectLiteralElementLike[] = []
        for(const key of Object.keys(obj)){
          const value = obj[key]
          if(value === null || value === undefined){
            continue
          }
          const propNode = factory.createPropertyAssignment(getObjectPropName(factory, key), recursive(value))
          properties.push(propNode)
        }
        return factory.createObjectLiteralExpression(properties, true)
      }
      default:{
        return factory.createIdentifier("undefined")
      }
      }
    }
  }
  return recursive(rootObj)
}
