import ApiBodyParserMiddleware from "@service-core/api/api-body-parser-middleware"
import { ApiServerConfig } from "@service-core/api/api-config"
import ApiCorsMiddleware from "@service-core/api/api-cors-middleware"
import ApiHandlerMiddleware from "@service-core/api/api-handler-middleware"
import ApiHealthcheckMiddleware from "@service-core/api/api-healthcheck-middleware"
import ApiHelmetMiddleware from "@service-core/api/api-helmet-middleware"
import ApiServer from "@service-core/api/api-server"
import ApiSwaggerMiddleware from "@service-core/api/api-swagger-middleware"
import { SystemRegistry } from "@service-core/runtime/system-registry"

export const standardApiRegistry = new SystemRegistry()
  .withConfig(ApiServerConfig)
  .withService(ApiServer)
  .withService(ApiHelmetMiddleware)
  .withService(ApiCorsMiddleware)
  .withService(ApiBodyParserMiddleware)
  .withService(ApiHealthcheckMiddleware)
  .withService(ApiHandlerMiddleware)
  .withService(ApiSwaggerMiddleware)

