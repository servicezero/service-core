import ApiBodyParserMiddleware from "@service-core/api/api-body-parser-middleware"
import { ApiServerConfig } from "@service-core/api/api-config"
import ApiHandlerMiddleware from "@service-core/api/api-handler-middleware"
import ApiServer from "@service-core/api/api-server"
import ApiSwaggerMiddleware from "@service-core/api/api-swagger-middleware"
import { SystemRegistry } from "@service-core/runtime/system-registry"

export const standardApiRegistry = new SystemRegistry()
  .withConfig(ApiServerConfig)
  .withService(ApiServer)
  .withService(ApiBodyParserMiddleware)
  .withService(ApiHandlerMiddleware)
  .withService(ApiSwaggerMiddleware)

