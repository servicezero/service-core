import { ApiServerConfig } from "@service-core/api/api-config"
import ApiServer from "@service-core/api/api-server"
import type { Server } from "http"
import type { AddressInfo } from "net"
import fetch from "node-fetch"

const mockLogger = {
  info: jest.fn(),
}

const mockSystem = {
  findAllInstances: jest.fn(),
}

const mockMiddleware = {
  createMiddleware: jest.fn(),
}

const mockMiddlewareHandler = jest.fn()

const mockConfig = new ApiServerConfig(undefined, 0)

describe("api server", () => {
  let server: ApiServer

  beforeEach(() => {
    mockMiddlewareHandler
      .mockImplementationOnce((req, res, next) => next())
      .mockImplementationOnce((req, res, next) => res.send("test"))
    mockMiddleware.createMiddleware.mockReturnValue(mockMiddlewareHandler)
    server = new ApiServer(mockLogger as any, mockSystem as any, mockConfig)
  })

  afterEach(async() => {
    if(server){
      await server.shutdown()
    }
  })

  it("finds middleware and starts express server, calls middleware and shuts down", async() => {
    mockSystem.findAllInstances.mockReturnValue([
      mockMiddleware,
      mockMiddleware,
    ])
    await server.startup()
    const srv: Server = (server as any).server
    const port = (srv.address?.() as AddressInfo)?.port
    expect((server as any).server).toBeDefined()
    expect(mockMiddlewareHandler).toHaveBeenCalledTimes(0)
    // call middleware
    const res = await fetch(`http://localhost:${ port }/test`, { method: "GET" })
    const txt = await res.text()
    expect(txt).toEqual("test")
    expect(mockMiddlewareHandler).toHaveBeenCalledTimes(2)
    await server.shutdown()
    expect((server as any).server).not.toBeDefined()
  })
})
