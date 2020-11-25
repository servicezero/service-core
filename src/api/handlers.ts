import type { AuthUser } from "@service-core/api/authentication"
import type { RequestHandler } from "express"

export type IApiMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT"

interface ICtor<T>{
  new (...args: any[]): T
}

export class ApiConfig<T, R>{
  /**
   * @param message The message class this handler supports
   * @param response The message class this handler responds with
   * @param allowedPermissions Optionally define if an api requires
   * specific list of permissions to access it. Defaults to allow any permission
   * @param authenticated Optionally define if an api must have
   * a valid authenticated user. Defaults to false
   * @param enableWebsockets Optionally enable support on websockets
   * for api message. Default to true
   * @param method Optionally specify http method for api message.
   * Defaults to "GET"
   * @param swaggerTag For swagger documentation define a tag
   * that the api will sit in.
   */
  constructor(
    readonly message: ICtor<T>,
    readonly response: ICtor<R>,
    readonly allowedPermissions: readonly string[] = [],
    readonly authenticated: boolean = false,
    readonly enableWebsockets: boolean = true,
    readonly method: IApiMethod = "GET",
    readonly swaggerTag?: string,
  ){}
}

export interface IApiHandler<T, R>{
  /**
   * Optionally define authorisation check for restricted message handling.
   * If message is not authorised a 401 or 403 status code will be returned in the response.
   * This will override the default authentication handler logic.
   * @param message
   * @param auth
   * @return Return true if request is authorised, false otherwise.
   */
  authorised?(message: T, auth?: AuthUser): Promise<boolean> | boolean
  /**
   * Handles the request
   * @param message
   * @param auth
   * @return Return the response object to be rendered as json
   */
  handle(message: T, auth?: AuthUser): Promise<R>
}

export interface IApiHandlerWithCtor<T, R> extends IApiHandler<T, R>{
  readonly constructor: IApiHandlerClass<T, R>
}

export interface IApiHandlerClass<T, R, D extends any[] = any[], DI extends any[] = any[]>{
  /**
   * Api handler configuration
   */
  readonly api: ApiConfig<T, R>
  /**
   * Dependency injectors
   */
  readonly inject: DI
  new (...dependency: D): IApiHandler<T, R>
}

export interface IApiMiddleware{
  /**
   * Creates middleware for express js
   */
  createMiddleware(): RequestHandler
}

export function isApiHandler(o: any): o is IApiHandlerWithCtor<any, any>{
  return o !== null && typeof o === "object" && o?.constructor?.api instanceof ApiConfig
}

export function isApiMiddleware(o: any): o is IApiMiddleware{
  return o !== null && typeof o === "object" && typeof o.createMiddleware === "function"
}
