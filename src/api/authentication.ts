import { createException } from "@service-core/runtime/exceptions"
import { StatusCodes } from "http-status-codes"

export class AuthUser{
  constructor(
    readonly id: string,
    readonly permissions: readonly string[],
  ){
  }
}

export const NotAuthenticatedException = createException("NotAuthenticatedException", {
  statusCode: StatusCodes.UNAUTHORIZED,
})

export const NotAuthorisedException = createException("NotAuthorisedException", {
  statusCode: StatusCodes.FORBIDDEN,
})
