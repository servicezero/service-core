import ApiHealthcheckMiddleware from "@service-core/api/api-healthcheck-middleware"
import type { Router } from "express"
import { StatusCodes } from "http-status-codes"

const mockReq = {
  method: "GET",
  url:    "/healthcheck",
}
const mockRes = {
  json:   jest.fn(),
  send:   jest.fn(),
  status: jest.fn(),
}
const mockNext = jest.fn()

describe("api healthcheck middleware", () => {
  const apiHandlers = new ApiHealthcheckMiddleware()
  let middleware: Router

  beforeEach(() => {
    jest.useRealTimers()
    middleware = apiHandlers.createMiddleware()
  })

  it("no url match calls next middleware", () => {
    middleware({ ...mockReq, url: "/bla" } as any, mockRes as any, mockNext)
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it("handles GET request and returns json health status", async() => {
    middleware(mockReq as any, mockRes as any, mockNext)

    await new Promise(r => setTimeout(r, 1))
    expect(mockNext).toHaveBeenCalledTimes(0)
    expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK)
    expect(mockRes.json).toHaveBeenCalledWith({
      healthy:   true,
      timestamp: expect.any(String),
    })
  })
})
