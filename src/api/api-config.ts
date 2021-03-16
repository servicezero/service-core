import type { ILogLabels } from "@service-core/logging/logger"
import type { Request } from "express"
import { v4 as uuid } from "uuid"

export interface IRequestToLogLabels{
  (request: Request): ILogLabels
}

const defaultApiRequestToLogLabels: IRequestToLogLabels = request => {
  // get or create correlation id
  const correlationId = request.header("X-Correlation-Id") ?? uuid()
  return {
    correlationId,
    requestOrigin:     request.get("origin"),
    requestRemoteAddr: request.header("X-Forwarded-For") ?? request.socket.remoteAddress,
    requestUrl:        request.url,
  }
}

export class ApiServerConfig{
  static readonly envConfigPrefix = "Api"

  /**
   * @param apiUrlPrefix Optionally specify the api url prefix. Defaults to "/api/v1"
   * @param port The port to run api server
   * @param corsWhiteList White list of origins to allow cors access
   * @param cspAllowedDomains Content security policy allowed domains
   * @param swaggerUrlPrefix Optionally specify the swagger url prefix. Defaults to "/api/swagger"
   * @param apiRequestToLogLabels Optionally specify function to convert request into log labels
   * to be run within logger context and carried across to every log entry during async processing
   * of each http request
   */
  constructor(
    readonly apiUrlPrefix: string = "/api/v1",
    readonly port: number = 3000,
    readonly corsWhiteList: string = "(^https?:\\/\\/([a-z0-9-_.]+\\.)?optus\\.([a-z]+)(\\.([a-z]+))?$)|(^https?:\\/\\/([a-z0-9-_.]+\\.)?gomo\\.com\\.au?$)|(^https?:\\/\\/localhost$)",
    readonly cspAllowedDomains: string[] = [
      "optus.com.au",
      "gomo.com.au",
      "localhost",
    ],
    readonly swaggerUrlPrefix: string = "/api/swagger",
    readonly apiRequestToLogLabels: IRequestToLogLabels = defaultApiRequestToLogLabels,
  ){
  }
}
