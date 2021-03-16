import { ApiServerConfig } from "@service-core/api/api-config"
import type { IApiMiddleware } from "@service-core/api/handlers"
import cors from "cors"

export default class ApiCorsMiddleware implements IApiMiddleware{
  static readonly inject = [ ApiServerConfig ]

  constructor(private readonly config: ApiServerConfig){
  }

  createMiddleware(){
    return cors({
      origin: new RegExp(this.config.corsWhiteList, "i"),
    })
  }
}

