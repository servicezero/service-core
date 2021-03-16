import type { IApiMiddleware } from "@service-core/api/handlers"
import bodyParser from "body-parser"

export default class ApiBodyParserMiddleware implements IApiMiddleware{
  createMiddleware(){
    return bodyParser.json()
  }
}

