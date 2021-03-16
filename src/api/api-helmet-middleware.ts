import { ApiServerConfig } from "@service-core/api/api-config"
import type { IApiMiddleware } from "@service-core/api/handlers"
import helmet from "helmet"

export default class ApiHelmetMiddleware implements IApiMiddleware{
  static readonly inject = [ ApiServerConfig ]

  constructor(private readonly config: ApiServerConfig){
  }

  createMiddleware(){
    const domains = this.config.cspAllowedDomains.flatMap(d => [
      d,
      `*.${ d }`,
    ]).join(" ")

    // TODO: Add in proper configuration for content security policy
    return helmet({
      contentSecurityPolicy: {
        directives: {
          "connect-src":               "'self' *.microsoftonline.com",
          "default-src":               `'self' data: blob: ${ domains }`,
          "font-src":                  `'self' ${ domains }`,
          "img-src":                   "'self' data: blob: *",
          "media-src":                 "'self' data: blob: *",
          "object-src":                "'none'",
          "script-src":                `'self' data: blob: 'unsafe-inline' 'unsafe-eval' ${ domains }`,
          "style-src":                 `'self' 'unsafe-inline' ${ domains }`,
          "upgrade-insecure-requests": "",
        },
        // TODO: Once configuration is stable disable report only so CSP is enforced
        reportOnly: true,
      },
    })
  }
}

