import { ApiServerConfig } from "@service-core/api/api-config"
import { isApiMiddleware } from "@service-core/api/handlers"
import Logger from "@service-core/logging/logger"
import { SystemContainer } from "@service-core/runtime/system-registry"
import express, { Express } from "express"
import type { Server } from "http"

export default class ApiServer{
  static readonly inject = [ Logger, SystemContainer, ApiServerConfig ]

  private exp?: Express
  private server?: Server

  constructor(private readonly log: Logger,
              private readonly system: SystemContainer,
              private readonly config: ApiServerConfig,
  ){}

  shutdown(){
    this.server?.close()
    this.server = undefined
  }

  startup(){
    const port = this.config.port
    this.exp = express()
    // find all middleware from system
    const middlewares = this.system.findAllInstances(isApiMiddleware)
    // register into express
    for(const m of middlewares){
      this.exp.use(m.createMiddleware())
    }

    return new Promise(resolve => {
      this.server = this.exp?.listen(port, async() => {
        await this.log.info(`Api server listening on http://localhost:${ port }`)
        resolve(true)
      })
    })
  }
}
