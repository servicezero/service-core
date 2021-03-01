import { getExceptionConfig } from "@service-core/runtime/exceptions"
import type { StatusCodes } from "http-status-codes"

export interface IException{
  readonly message: string
  readonly name: string
  readonly stack?: string
}

export interface IExceptionPayload<E extends IException = IException>{
  readonly correlationId: string
  readonly error: E
  readonly statusCode: StatusCodes
}

/**
 * Creates a safe exception payload to return to the client
 * @param correlationId The request correlation id for log tracing
 * @param err The error object
 */
export function createExceptionPayload(correlationId: string, err: Error): IExceptionPayload{
  const { allowedInResponse, statusCode } = getExceptionConfig(err)
  if(allowedInResponse){
    return {
      correlationId,
      error: {
        ...err,
        message: err.message,
        name:    err.name,
        stack:   err.stack,
      },
      statusCode,
    }
  }
  return {
    correlationId,
    error: {
      message: "Sorry an error has occurred on the server, please quote correlation id as reference for further investigation",
      name:    err.name,
    },
    statusCode,
  }
}
