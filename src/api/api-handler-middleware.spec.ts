import { ApiServerConfig } from "@service-core/api/api-config"
import ApiHandlerMiddleware from "@service-core/api/api-handler-middleware"
import {
  ApiConfig, IApiHandler,
} from "@service-core/api/handlers"
import { createException } from "@service-core/runtime/exceptions"
import type { IClassSpec } from "@service-core/runtime/type-specification"
import type { Router } from "express"
import { StatusCodes } from "http-status-codes"

const mockHandle = jest.fn()
const mockSystem = {
  findAllInstances: jest.fn(),
}
const mockLogger = {
  error:       jest.fn(),
  withContext: jest.fn(),
  withLabels:  jest.fn(),
}
const mockReqToLabels = jest.fn()
const mockLabels = {
  correlationId: "c1",
}
const mockConfig = {
  apiRequestToLogLabels: mockReqToLabels,
  apiUrlPrefix:          "/api",
}
const mockReq = {
  body:   {},
  method: "GET",
  url:    "/api/",
}
const mockRes = {
  json:   jest.fn(),
  send:   jest.fn(),
  status: jest.fn(),
}
const mockNext = jest.fn()

class MsgA{
  static class: IClassSpec<MsgA>
  constructor(readonly name: string){}
}

class RespA{
  static class: IClassSpec<RespA>
  constructor(readonly count: number){}
}

class HandlerA implements IApiHandler<MsgA, RespB>{
  static api = new ApiConfig(MsgA, RespA, undefined, undefined, true, "GET")
  handle = mockHandle
}


class MsgB{
  static class: IClassSpec<MsgB>
  constructor(readonly count: number){}
}

class RespB{
  static class: IClassSpec<RespB>
  constructor(readonly name: string){}
}
class HandlerB implements IApiHandler<MsgB, RespB>{
  static api = new ApiConfig(MsgB, RespB, undefined, undefined, true, "POST")
  handle = mockHandle
}

describe("api handler middleware", () => {
  const apiHandlers = new ApiHandlerMiddleware(mockLogger as any, mockSystem as any, mockConfig as any)
  let middleware: Router

  beforeEach(() => {
    jest.useRealTimers()
    mockSystem.findAllInstances.mockReturnValue([
      new HandlerA(),
      new HandlerB(),
    ])
    middleware = apiHandlers.createMiddleware()
    mockReqToLabels.mockReturnValue(mockLabels)
    mockLogger.withContext.mockImplementation((labels, fn) => fn())
    mockLogger.withLabels.mockImplementation(() => mockLogger)
  })

  it("no url match calls next middleware", () => {
    middleware({ ...mockReq, url: "/bla" } as any, mockRes as any, mockNext)
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockReqToLabels).toHaveBeenCalledTimes(0)
  })

  it("no handler found calls next middleware", async() => {
    middleware({ ...mockReq, url: mockReq.url + "Foo" } as any, mockRes as any, mockNext)
    await new Promise(r => setTimeout(r, 1))
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockReqToLabels).toHaveBeenCalledTimes(0)
  })

  it("handles GET request and serializes into message type", async() => {
    mockHandle.mockResolvedValueOnce(new RespA(24))

    middleware({
      ...mockReq,
      query: {
        name: "hi",
      },
      url: mockReq.url + MsgA.name,
    } as any, mockRes as any, mockNext)

    expect(mockLogger.withContext).toHaveBeenCalledWith(mockLabels, expect.any(Function))

    await new Promise(r => setTimeout(r, 1))
    expect(mockNext).toHaveBeenCalledTimes(0)
    expect(mockReqToLabels).toHaveBeenCalledTimes(1)
    expect(mockHandle).toHaveBeenCalledTimes(1)
    expect(mockHandle).toHaveBeenCalledWith(new MsgA("hi"))
    expect(mockLogger.error).toHaveBeenCalledTimes(0)
    expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockRes.json).toHaveBeenCalledWith({
      count: 24,
    })
  })

  it("handles POST request and serializes into message type", async() => {
    mockHandle.mockResolvedValueOnce({ extra: 123, name: "hi" })

    middleware({
      ...mockReq,
      body: {
        count: "12",
      },
      method: "post",
      url:    mockReq.url + MsgB.name,
    } as any, mockRes as any, mockNext)

    expect(mockLogger.withContext).toHaveBeenCalledWith(mockLabels, expect.any(Function))

    await new Promise(r => setTimeout(r, 1))
    expect(mockNext).toHaveBeenCalledTimes(0)
    expect(mockReqToLabels).toHaveBeenCalledTimes(1)
    expect(mockHandle).toHaveBeenCalledTimes(1)
    expect(mockHandle).toHaveBeenCalledWith(new MsgB(12))
    expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.CREATED)
    expect(mockRes.json).toHaveBeenCalledWith({
      name: "hi",
    })
  })

  it("handles exception and responds with json and error message", async() => {
    const ex = createException("HandleEx", { statusCode: StatusCodes.FORBIDDEN })
    mockHandle.mockRejectedValueOnce(new ex("Bad"))

    middleware({
      ...mockReq,
      url: mockReq.url + MsgA.name,
    } as any, mockRes as any, mockNext)

    expect(mockLogger.withContext).toHaveBeenCalledWith(mockLabels, expect.any(Function))

    await new Promise(r => setTimeout(r, 1))
    expect(mockNext).toHaveBeenCalledTimes(0)
    expect(mockReqToLabels).toHaveBeenCalledTimes(1)
    expect(mockHandle).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockHandle).toHaveBeenCalledWith(new MsgA(""))
    expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN)
    expect(mockRes.json).toHaveBeenCalledWith({
      correlationId: "c1",
      error:         {
        message: expect.any(String),
        name:    "HandleEx",
      },
      statusCode: StatusCodes.FORBIDDEN,
    })
  })

  it("handles exception when no correlation id was generated in labels", async() => {
    const ex = createException("HandleEx", { statusCode: StatusCodes.FORBIDDEN })
    mockHandle.mockRejectedValueOnce(new ex("Bad"))
    mockReqToLabels.mockReturnValue({})

    middleware({
      ...mockReq,
      url: mockReq.url + MsgA.name,
    } as any, mockRes as any, mockNext)

    expect(mockLogger.withContext).toHaveBeenCalledWith({}, expect.any(Function))

    await new Promise(r => setTimeout(r, 1))
    expect(mockNext).toHaveBeenCalledTimes(0)
    expect(mockReqToLabels).toHaveBeenCalledTimes(1)
    expect(mockHandle).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.withLabels).toHaveBeenCalledTimes(1)
    expect(mockLogger.withLabels).toHaveBeenCalledWith({ correlationId: expect.any(String) })
    expect(mockHandle).toHaveBeenCalledWith(new MsgA(""))
    expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN)
    expect(mockRes.json).toHaveBeenCalledWith({
      correlationId: expect.any(String),
      error:         {
        message: expect.any(String),
        name:    "HandleEx",
      },
      statusCode: StatusCodes.FORBIDDEN,
    })
  })

})
