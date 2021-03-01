import { createException } from "@service-core/runtime/exceptions"
import { StatusCodes } from "http-status-codes"

export class AuthUser{
  /**
   * @param id Authentication identifier
   * @param permissions A list of permissions / roles the user has
   * which determines which apis etc it can access
   */
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
