import { ApiServerConfig } from "@service-core/api/api-config"
import {
  IApiHandlerClass,
  IApiMiddleware,
  isApiHandler,
} from "@service-core/api/handlers"
import { SystemContainer } from "@service-core/runtime/system-registry"
import { findEnumKey } from "@service-core/runtime/type-serializer"
import {
  ITypeDef,
  Typ,
  getObjPath,
  getOrCreateClassDef,
} from "@service-core/runtime/type-specification"
import express, { Router } from "express"
import { absolutePath } from "swagger-ui-dist"
import { URL } from "url"

const isNotUndefined = <T>(o: T): o is NonNullable<T> => !(o === null || o === undefined)

function swaggerHtmlTemplate(docsUrl: string){
  return `
<!-- HTML for static distribution bundle build -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="./swagger-ui.css" />
    <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16" />
    <style>
      html
      {
        box-sizing: border-box;
        overflow: -moz-scrollbars-vertical;
        overflow-y: scroll;
      }

      *,
      *:before,
      *:after
      {
        box-sizing: inherit;
      }

      body
      {
        margin:0;
        background: #fafafa;
      }
    </style>
  </head>

  <body>
    <div id="swagger-ui"></div>

    <script src="./swagger-ui-bundle.js" charset="UTF-8"> </script>
    <script src="./swagger-ui-standalone-preset.js" charset="UTF-8"> </script>
    <script>
    window.onload = function() {
      // Begin Swagger UI call region
      const ui = SwaggerUIBundle({
        url: "${ docsUrl }",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
      // End Swagger UI call region
      window.ui = ui;
    };
  </script>
  </body>
</html>
`
}

function parseSchema(rootDef: ITypeDef, rootDefaultValue?: any){
  const recursive = (def: ITypeDef, defaultValue?: any): any => {
    switch(def.type){
    case Typ.Str:
      return { default: defaultValue, type: "string" }
    case Typ.Int:
      return { default: defaultValue, format: "int32", type: "integer" }
    case Typ.Float:
      return { default: defaultValue, format: "float64", type: "number" }
    case Typ.Bool:
      return { default: defaultValue, type: "boolean" }
    case Typ.BigInt:
      return { default: defaultValue, format: "int64", type: "integer" }
    case Typ.Buff:
      return { format: "byte", type: "string" }
    case Typ.Date:
      return { default: "YYYY-MM-DDThh:mm:ss.sssZ", format: "date-time", type: "string" }
    case Typ.Arr:
    case Typ.Set:
      return { default: defaultValue, items: recursive(def.valType), type: "array" }
    case Typ.Map:
      return { additionalProperties: recursive(def.valType), default: defaultValue, type: "object" }
    case Typ.Enum:
    case Typ.EnumLiteral:
      return {
        default: defaultValue ?? findEnumKey(def.unmatchedValue, def),
        enum:    Array.from(def.vals.keys()).map(v => findEnumKey(v, def)),
        type:    "string",
      }
    case Typ.Class:{
      // loop through class properties
      // and get their key / values
      const instance: any = new def.ctor()
      const properties: any = {}
      const required = []
      for(const property of def.properties){
        if(property.required){
          required.push(property.name)
        }
        properties[property.name] = recursive(property, instance[property.name])
      }
      return { properties, required, type: "object" }
    }
    case Typ.Union:{
      return {
        oneOf: Object.values(def.values).map(t => recursive(t)),
      }
    }
    }
  }
  return recursive(rootDef, rootDefaultValue)
}

function requestBody(schemaName: string){
  return {
    content: {
      "*/*": {
        schema: {
          $ref: `#/components/schemas/${ schemaName }`,
        },
      },
    },
    description: "Created user object",
    required:    true,
  }
}

function parseParameters(rootDef: ITypeDef, inside: "header" | "path" | "query"){
  const parameters: any[] = []

  const recursive = (def: ITypeDef, name: string, defaultValue?: any): any => {
    switch(def.type){
    case Typ.Str:
    case Typ.Int:
    case Typ.Float:
    case Typ.Bool:
    case Typ.BigInt:
    case Typ.Buff:
    case Typ.Date:
    case Typ.Enum:
    case Typ.EnumLiteral:
    case Typ.Arr:
    case Typ.Set:
    case Typ.Map:
    case Typ.Union:{
      const param = {
        in:       inside,
        name,
        required: def.required,
        schema:   parseSchema(def, defaultValue),
      }
      parameters.push(param)
      break
    }
    case Typ.Class:{
      // loop through class properties
      const instance: any = new def.ctor()
      for(const property of def.properties){
        recursive(property, getObjPath(name, property.name), instance[property.name])
      }
      break
    }
    }
  }
  recursive(rootDef, "")

  return parameters
}

function swaggerRoot(basePath: string, host: string, schemas: any, paths: any, tags: readonly string[]){
  return {
    components: {
      schemas,
      securitySchemes: {
        "X-Unibet-Authorization": {
          in:   "header",
          name: "X-Unibet-Authorization",
          type: "apiKey",
        },
      },
    },
    externalDocs: {
      description: "Find out more about Swagger",
      url:         "http://swagger.io",
    },
    info: {
      description: "Api documentation",
      title:       "Swagger BFF",
      version:     "1.0.5",
    },
    openapi: "3.0.1",
    paths,
    servers: [
      {
        url: `${ host }${ basePath }`,
      },
    ],
    tags:
      tags.map(name => ({
        description: "Everything about your Events",
        name,
      })),
  }
}

function swaggerHandler({ api }: IApiHandlerClass<any, any>){
  const typeDef = getOrCreateClassDef(api.message as any)
  const msgName = api.message.name
  const respName = api.response.name
  const isGet = api.method === "GET"

  return {
    components: {
      schemas: {
        [msgName]:  parseSchema(typeDef),
        [respName]: parseSchema(getOrCreateClassDef(api.response as any)),
      },
    },
    paths: {
      [`/${ msgName }`]: {
        [api.method.toLowerCase()]: {
          description: "Multiple status values can be provided with comma separated strings",
          operationId: msgName,
          parameters:  isGet ? parseParameters(typeDef, "query") : undefined,
          requestBody: !isGet ? requestBody(msgName) : undefined,
          responses:   {
            200: {
              content: {
                "application/json": {
                  schema: {
                    $ref: `#/components/schemas/${ respName }`,
                    type: "object",
                  },
                },
              },
              description: "successful operation",
            },
            400: {
              description: "Invalid status value",
            },
          },
          summary: "Finds events by key",
          tags:    api.swaggerTag ? [ api.swaggerTag ] : [],
        },
      },
    },
  }
}

export default class ApiSwaggerMiddleware implements IApiMiddleware{
  static readonly inject = [ SystemContainer, ApiServerConfig ]

  constructor(private readonly system: SystemContainer,
              private readonly config: ApiServerConfig){}

  createMiddleware(){
    const router = Router()
    const swaggerUrl = this.config.swaggerUrlPrefix
    const apiUrl = this.config.apiUrlPrefix
    const handlers = this.system.findAllInstances(isApiHandler)
    const allTags = Array.from(new Set(handlers.map(h => h.constructor.api.swaggerTag).filter(isNotUndefined)))
    const mergedDefs = handlers.map(h => swaggerHandler(h.constructor))
      .reduce((prev, next) => {
        Object.assign(prev.paths, next.paths)
        Object.assign(prev.components.schemas, next.components.schemas)
        return prev
      }, { components: { schemas: {} }, paths: {} })

    // Custom template for swagger api
    router.get(swaggerUrl, (req, res, next) => {
      const docsUrl = new URL(`${ req.protocol }://${ req.get("host") }${ req.path.replace(/\/+$/, "") }/docs.json`)
      res.send(swaggerHtmlTemplate(docsUrl.href))
    })
    // Dynamically generated swagger definition
    router.get(`${ swaggerUrl }/docs.json`, (req, res, next) => {
      const swaggerJson = swaggerRoot(apiUrl, `${ req.protocol }://${ req.get("host") }`, mergedDefs.components.schemas, mergedDefs.paths, allTags)
      res.json(swaggerJson)
    })
    // Static assets to display swagger ui
    router.use(swaggerUrl, express.static(absolutePath()))
    return router
  }
}
