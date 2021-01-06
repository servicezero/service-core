import { System } from "@service-core/runtime/system"
import { SystemRegistry } from "@service-core/runtime/system-registry"
import * as runtimeProcess from "@service-core/runtime/process"
import type { IClassSpec } from "@service-core/runtime/type-specification"
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
  env:    {},
}
const startupMock = jest.fn()
const shutdownMock = jest.fn()

class ConfigA{
  static readonly class: IClassSpec<ConfigA>
  static readonly envConfigPrefix = "ConfigA"

  constructor(
    readonly foo: string = "def1",
    readonly bar: boolean = false,
  ){}
}
class ConfigB{
  static readonly class: IClassSpec<ConfigB>
  static readonly envConfigPrefix = "ConfigB"

  constructor(
    readonly count: number = 4,
    readonly items?: string[],
  ){}
}

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

class ServiceD{
  shutdown = shutdownMock
  startup = startupMock
}

class ServiceE{
  static inject = [ ServiceD ]
}


const registry = new SystemRegistry()
  .withConfig(ConfigA)
  .withConfig(ConfigB)
  .withService(ServiceA)
  .withService(ServiceB)
  .withService(ServiceC)

const registryEnvConfigs = registry
  .withEnvConfig("default", {
    "ConfigA.foo":   "v1",
    "ConfigB.items": [ "a", "b" ],
  })
  .withEnvConfig("dev", {
    "ConfigA.foo":   "v2",
    "ConfigB.items": [ "c" ],
  })

describe("system", () => {
  let sys: System<any>

  beforeEach(() => {
    procMock.env = {}
    sys = new System(logMock as any, registry, "dev", procMock as any)
  })

  it("registers graceful shutdown", () => {
    expect(gracefulShutdownMock).toHaveBeenCalledTimes(1)
    expect(gracefulShutdownMock).toHaveBeenCalledWith(logMock, expect.any(Function), procMock)
  })

  it("startup all services in registry", async() => {
    const sys = new System(logMock as any, registry.withService(ServiceE), "dev", procMock as any)
    await sys.startup()

    expect(sys.findInstance(ServiceA)).toBeInstanceOf(ServiceA)
    expect(sys.findInstance(ServiceB)).toBeInstanceOf(ServiceB)
    expect(sys.findInstance(ServiceC)).toBeInstanceOf(ServiceC)
    expect(sys.findInstance(ServiceD)).toBeInstanceOf(ServiceD)
    expect(sys.findInstance(ServiceE)).toBeInstanceOf(ServiceE)

    expect(startupMock).toHaveBeenCalledTimes(3)
    expect(shutdownMock).toHaveBeenCalledTimes(0)
  })

  it("startup creates env config with defaults", async() => {
    const sys = new System(logMock as any, registry, "dev", procMock as any)
    await sys.startup()

    const configA = sys.findInstance(ConfigA)
    const configB = sys.findInstance(ConfigB)

    expect(configA).toEqual(new ConfigA())
    expect(configB).toEqual(new ConfigB())
  })

  it("startup creates env config with config properties for si", async() => {
    const sys = new System(logMock as any, registryEnvConfigs, "si", procMock as any)
    await sys.startup()

    const configA = sys.findInstance(ConfigA)
    const configB = sys.findInstance(ConfigB)

    expect(configA).toEqual(new ConfigA("v1"))
    expect(configB).toEqual(new ConfigB(4, [ "a", "b" ]))
  })

  it("startup creates env config with config properties for dev", async() => {
    const sys = new System(logMock as any, registryEnvConfigs, "dev", procMock as any)
    await sys.startup()

    const configA = sys.findInstance(ConfigA)
    const configB = sys.findInstance(ConfigB)

    expect(configA).toEqual(new ConfigA("v2"))
    expect(configB).toEqual(new ConfigB(4, [ "c" ]))
  })

  it("startup creates env config with config properties for dev and env vars", async() => {
    procMock.env = {
      "CONFIGA.BaR":   "1",
      "CONFIGB.count": "12",
      "CoNFiga.FoO":   "v4",
      NODE_ENV:        "bla",
      SOME:            "ergre",
    }
    const sys = new System(logMock as any, registryEnvConfigs, "dev", procMock as any)
    await sys.startup()

    const configA = sys.findInstance(ConfigA)
    const configB = sys.findInstance(ConfigB)

    expect(configA).toEqual(new ConfigA("v4", true))
    expect(configB).toEqual(new ConfigB(12, [ "c" ]))
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

