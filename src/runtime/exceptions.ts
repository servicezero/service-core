import { StatusCodes } from "http-status-codes"

export interface IExceptionConfig {
  /**
   * Optionally define if an exception is allowed to be returned in
   * the response to client. Typically you want this to be false so
   * exception messages are not leaked to client.
   * Defaults to false
   */
  readonly allowedInResponse: boolean
  /**
   * Optionally define the http status code in response when this exception
   * is thrown.
   * Defaults to {@link StatusCodes.INTERNAL_SERVER_ERROR}
   */
  readonly statusCode: StatusCodes
}

export interface IExceptionClass{
  /**
   * Exception configuration
   */
  readonly exception: IExceptionConfig
  new (message?: string): Error
}

const defaultConfig: IExceptionConfig = {
  allowedInResponse: false,
  statusCode:        StatusCodes.INTERNAL_SERVER_ERROR,
}

/**
 * Finds exception configuration for Error constructor or uses default
 * @param err
 */
export function getExceptionConfig<T extends Error>(err: T): IExceptionConfig{
  return (err.constructor as IExceptionClass).exception ?? defaultConfig
}

/**
 * Create an exception which extends Error class and
 * configures the exception so the system knows how to handle
 * responses to client etc.
 * @param name The name of the exception
 * @param configuration Optional configuration for exception
 */
export function createException<K extends string>(
  name: K,
  configuration: Partial<IExceptionConfig> = {}): IExceptionClass{
  const { allowedInResponse = defaultConfig.allowedInResponse, statusCode = defaultConfig.statusCode } = configuration

  class Exception extends Error{
    static readonly exception: IExceptionConfig = {
      allowedInResponse,
      statusCode,
    }
    constructor(message?: string){
      super(message)
      this.name = this.constructor.name
    }
  }
  Object.defineProperty(Exception, "name", {
    value: name,
  })
  return Exception
}
