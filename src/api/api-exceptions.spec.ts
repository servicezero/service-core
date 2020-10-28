import { createExceptionPayload } from "@service-core/api/api-exceptions.spec"
import { createException } from "@service-core/runtime/exceptions"
import { StatusCodes } from "http-status-codes"

describe("api exceptions", () => {

  it("creates restricted exception", () => {
    const TestEx = createException("TestEx")

    expect(createExceptionPayload("abc", new TestEx("failure"))).toEqual({
      correlationId: "abc",
      error:         {
        message: expect.any(String),
        name:    "TestEx",
      },
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    })
  })

  it("creates exception with stacktrace", () => {
    const TestEx = createException("TestEx", {
      allowedInResponse: true,
      statusCode:        StatusCodes.FORBIDDEN,
    })

    expect(createExceptionPayload("abc", new TestEx("failure"))).toEqual({
      correlationId: "abc",
      error:         {
        message: "failure",
        name:    "TestEx",
        stack:   expect.any(String),
      },
      statusCode: StatusCodes.FORBIDDEN,
    })
  })

})
