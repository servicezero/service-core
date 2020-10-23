import {
  createException,
  getExceptionConfig,
} from "@service-core/runtime/exceptions"
import { StatusCodes } from "http-status-codes"

describe("exceptions", () => {
  it("create a new exception class with configuration", () => {
    const Ex = createException("TestException", {
      allowedInResponse: true,
      statusCode:        StatusCodes.ACCEPTED,
    })

    expect(Ex.name).toBe("TestException")
    expect(Ex.exception).toEqual({
      allowedInResponse: true,
      statusCode:        StatusCodes.ACCEPTED,
    })
    expect(getExceptionConfig(new Ex())).toEqual({
      allowedInResponse: true,
      statusCode:        StatusCodes.ACCEPTED,
    })
    expect(() => {
      throw new Ex("test fail")
    }).toThrow(new Ex("test fail"))
  })

  it("create a new exception class with default configuration", () => {
    const Ex = createException("TestException")

    expect(Ex.name).toBe("TestException")
    expect(Ex.exception).toEqual({
      allowedInResponse: false,
      statusCode:        StatusCodes.INTERNAL_SERVER_ERROR,
    })
    expect(() => {
      throw new Ex("test fail")
    }).toThrow(new Ex("test fail"))
  })

  it("get default exception config", () => {
    expect(getExceptionConfig(new Error())).toEqual({
      allowedInResponse: false,
      statusCode:        StatusCodes.INTERNAL_SERVER_ERROR,
    })
  })
})
