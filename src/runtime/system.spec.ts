import { System } from "@service-core/runtime/system"
import { SystemRegistry } from "@service-core/runtime/system-registry"
import * as runtimeProcess from "@service-core/runtime/process"
import { mockExport } from "@service-core/testing/export-mocks"

const gracefulShutdownMock = mockExport(runtimeProcess, "gracefulShutdown", jest.fn())
const logMock = {
  error: jest.fn(),
  info:  jest.fn(),
  withLabels(){
    return logMock
  },
}
const procMock = {
  __proc: "a",
}
const startupMock = jest.fn()
const shutdownMock = jest.fn()

class ConfigA{}
class ConfigB{}

class ServiceA{
  shutdown = shutdownMock
  startup = startupMock
}

class ServiceB{
  shutdown = shutdownMock
}

class ServiceC{
  shutdown = shutdownMock
  startup = startupMock
}


const registry = new SystemRegistry()
  .withConfig(new ConfigA())
  .withConfig(new ConfigB())
  .withService(ServiceA)
  .withService(ServiceB)
  .withService(ServiceC)

describe("system", () => {
  let sys: System

  beforeEach(() => {
    sys = new System(logMock as any, registry, procMock as any)
  })

  it("registers graceful shutdown", () => {
    expect(gracefulShutdownMock).toHaveBeenCalledTimes(1)
    expect(gracefulShutdownMock).toHaveBeenCalledWith(logMock, expect.any(Function), procMock)
  })

  it("startup all services in registry", async() => {
    await sys.startup()

    const serviceA = sys.findInstance(ServiceA)
    expect(serviceA).toBeInstanceOf(ServiceA)
    expect(serviceA?.startup).toHaveBeenCalledTimes(2)
    expect(serviceA?.shutdown).toHaveBeenCalledTimes(0)

    const serviceB = sys.findInstance(ServiceB)
    expect(serviceB).toBeInstanceOf(ServiceB)
    expect(serviceB?.shutdown).toHaveBeenCalledTimes(0)
  })

  it("startup does nothing when already running", async() => {
    await sys.startup()
    await sys.startup()

    const serviceA = sys.findInstance(ServiceA)
    expect(serviceA).toBeInstanceOf(ServiceA)
    expect(serviceA?.startup).toHaveBeenCalledTimes(2)
  })

  it("startup triggers shutdown when service fails to start", async() => {
    startupMock
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error("start fail"))
    await sys.startup()

    expect(sys.findAllInstances((o): o is any => true)).toEqual([])
    expect(startupMock).toHaveBeenCalledTimes(2)
    expect(shutdownMock).toHaveBeenCalledTimes(1)
  })

  it("shutdown does nothing when not running", async() => {
    await sys.shutdown()
    expect(shutdownMock).toHaveBeenCalledTimes(0)
  })

  it("shutdown skips service when fails to shutdown", async() => {
    shutdownMock
      .mockRejectedValueOnce(new Error("start fail"))
    await sys.startup()
    await sys.shutdown()

    expect(sys.findAllInstances((o): o is any => true)).toEqual([])
    expect(shutdownMock).toHaveBeenCalledTimes(2)
  })
})

