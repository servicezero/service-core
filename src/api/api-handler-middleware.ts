import {
  IApiHandlerWithCtor,
  IApiMethod,
  IApiMiddleware,
  isApiHandler,
} from "@service-core/api/handlers"
import { deserializeTypeFromRequest } from "@service-core/api/request-serializer"
import Logger from "@service-core/logging/logger"
import { ApiServerConfig } from "@service-core/api/api-config"
import { createExceptionPayload } from "@service-core/api/api-exceptions"
import { SystemContainer } from "@service-core/runtime/system-registry"
import {
  deserializeTypeFromJson,
  serializeTypeToJson,
} from "@service-core/runtime/type-serializer"
import { Router } from "express"
import { StatusCodes } from "http-status-codes"
import { v4 as uuid } from "uuid"

interface IApiHandlerMatchOpts{
  readonly messageType: string
  readonly method: IApiMethod
}

const requestMethodToHttpStatus: { readonly [P in IApiMethod]: StatusCodes } = {
  DELETE: StatusCodes.OK,
  GET:    StatusCodes.OK,
  PATCH:  StatusCodes.OK,
  POST:   StatusCodes.CREATED,
  PUT:    StatusCodes.OK,
}

const isApiHandlerMatch = ({ method, messageType }: IApiHandlerMatchOpts) => (o: IApiHandlerWithCtor<any, any>): o is IApiHandlerWithCtor<any, any> => {
  const api = o.constructor.api
  return api.message.name === messageType
         && api.method === method
}

export default class ApiHandlerMiddleware implements IApiMiddleware{
  static readonly inject = [ Logger, SystemContainer, ApiServerConfig ]

  constructor(
    private readonly log: Logger,
    private readonly system: SystemContainer,
    private readonly config: ApiServerConfig){}

  createMiddleware(){
    // find all handlers from system
    const handlers = this.system.findAllInstances(isApiHandler)
    const router = Router()

    router.all(`${ this.config.apiUrlPrefix }/:messageType`, async(req, res, next) => {
      const method = req.method.toUpperCase() as IApiMethod
      const { messageType } = req.params
      // TODO: Handle authorisation checks
      // TODO: Handle JWT tokens to auth object
      const handler = handlers.find(isApiHandlerMatch({ messageType, method }))
      // continue to other middleware to handle request
      if(!handler){
        next()
        return
      }
      // create correlation id for the request
      const correlationId = uuid()
      try{
        // Run with logging context so every log contains
        // context bound information
        await this.log.withContext({
          correlationId,
          requestUrl: req.url,
        }, async() => {
          let msg: any
          // deserialize request for GET
          if(method === "GET"){
            msg = deserializeTypeFromRequest(handler.constructor.api.message, req.query as any)
          }else{
            msg = deserializeTypeFromJson(handler.constructor.api.message, req.body)
          }
          const response = await handler.handle(msg)
          // serialize response
          const json = response ? serializeTypeToJson(handler.constructor.api.response, response) : response
          res.status(requestMethodToHttpStatus[method])
          res.json(json)
        })
      } catch(e){
        await this.log.error(e)
        const err = createExceptionPayload(correlationId, e)
        res.status(err.statusCode)
        res.json(err)
      }
    })
    return router
  }
}

