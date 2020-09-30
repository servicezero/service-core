import {
  CyclicDependenciesException,
  SystemContainer,
  SystemRegistry,
} from "@service-core/runtime/system-registry"
import Logger from "@service-core/logging/logger"

const shutdownMock = jest.fn()
const startupMock = jest.fn()

class ConfigA{}
class ConfigB{}

class ServiceC{
  static inject = [ ConfigA ]

  shutdown = shutdownMock
  startup = startupMock

  constructor(readonly configA: ConfigA){}
}

class ServiceA{
  static inject = [ ConfigA, ConfigB, Logger ]

  constructor(readonly configA: ConfigA,
              readonly configB: ConfigB,
              readonly log: Logger){}

}
class ServiceAO extends ServiceA{}
class ServiceB{
  static inject = [ ServiceC, Logger ]

  shutdown = shutdownMock
  startup = startupMock

  constructor(readonly serviceC: ServiceC,
              readonly log: Logger){}
}

class ServiceACyclic{}
class ServiceBCyclic{
  static inject = [ ServiceACyclic ]
}
(ServiceACyclic as any).inject = [ ServiceBCyclic ]

const isAny = (o: any): o is any => !!o

describe("system registry", () => {
  it("merges configs", () => {
    const reg1 = new SystemRegistry().withConfig(new ConfigA())
    const reg2 = reg1.withConfig(new ConfigB())
    expect(reg1.configs.size).toBe(1)
    expect(reg2.configs.size).toBe(2)
  })

  it("merges configs with override class", () => {
    const reg1 = new SystemRegistry().withConfig(new ConfigA())
    const reg2 = reg1.withConfig(ConfigA, new ConfigB())
    expect(reg1.configs.size).toBe(1)
    expect(reg2.configs.size).toBe(1)
    expect(reg1.configs.get(ConfigA)).toBeInstanceOf(ConfigA)
    expect(reg2.configs.get(ConfigA)).toBeInstanceOf(ConfigB)
  })

  it("merges services", () => {
    const reg1 = new SystemRegistry().withService(ServiceA)
    const reg2 = reg1.withService(ServiceB)
    expect(reg1.services.size).toBe(1)
    expect(reg2.services.size).toBe(2)
  })

  it("merges services with override class", () => {
    const reg1 = new SystemRegistry().withService(ServiceA)
    const reg2 = reg1.withService(ServiceA, ServiceAO)
    expect(reg1.services.size).toBe(1)
    expect(reg2.services.size).toBe(1)
    expect(reg1.services.get(ServiceA)).toBe(ServiceA)
    expect(reg2.services.get(ServiceA)).toBe(ServiceAO)
  })

  it("merges registries", () => {
    const reg1 = new SystemRegistry()
      .withConfig(new ConfigA())
      .withService(ServiceA)
    const reg2 = new SystemRegistry()
      .withConfig(new ConfigB())
      .withService(ServiceB)
    const reg3 = reg1.withRegistry(reg2)
    expect(reg1.configs.size).toBe(1)
    expect(reg1.services.size).toBe(1)

    expect(reg2.configs.size).toBe(1)
    expect(reg2.services.size).toBe(1)

    expect(reg3.configs.size).toBe(2)
    expect(reg3.services.size).toBe(2)
  })

})

describe("system container", () => {

  const reg = new SystemRegistry()
    .withConfig(new ConfigA())
    .withConfig(new ConfigB())
    .withService(ServiceA)
    .withService(ServiceB)
    .withService(Logger)

  let container: SystemContainer

  beforeEach(() => {
    container = new SystemContainer(reg)
  })

  it("find instance by class when not started", () => {
    expect(container.findInstance(ConfigA)).toBeUndefined()
  })

  it("find instance by class", () => {
    container.getInstance(ServiceA)
    container.getInstance(ServiceB)
    container.getInstance(ServiceC)

    expect(container.findInstance(ConfigA)).toBeInstanceOf(ConfigA)
    expect(container.findInstance(ConfigB)).toBeInstanceOf(ConfigB)
    expect(container.findInstance(ServiceA)).toBeInstanceOf(ServiceA)
    expect(container.findInstance(ServiceB)).toBeInstanceOf(ServiceB)
    expect(container.findInstance(ServiceC)).toBeInstanceOf(ServiceC)
  })

  it("find instances by predicate", () => {
    container.getInstance(ServiceA)
    container.getInstance(ServiceB)
    container.getInstance(ServiceC)

    const isConfigAorB = (o: any): o is ConfigA | ConfigB => o instanceof ConfigA || o instanceof ConfigB

    const instances = container.findAllInstances(isConfigAorB)
    expect(instances.length).toBe(2)
    expect(instances[0]).toBeInstanceOf(ConfigA)
    expect(instances[1]).toBeInstanceOf(ConfigB)
  })

  it("get instance with Logger injection binds logger to class injecting it", () => {
    container.getInstance(ServiceA)
    container.getInstance(ServiceB)

    const serviceA = container.findInstance(ServiceA)
    const serviceB = container.findInstance(ServiceB)
    expect(serviceA?.log).not.toBe(serviceB?.log)
    expect((serviceA?.log as any).labels).toEqual({ className: ServiceA.name })
    expect((serviceB?.log as any).labels).toEqual({ className: ServiceB.name })
  })

  it("get instance when already exists in system", () => {
    expect(container.getInstance(ServiceA)).toBe(container.getInstance(ServiceA))
  })

  it("get instance by concrete class or override class should be same instance", () => {
    const container = new SystemContainer(reg.withService(ServiceA, ServiceAO))
    expect(container.getInstance(ServiceA)).toBe(container.getInstance(ServiceAO))
    expect(container.getInstance(ServiceA)).toBeInstanceOf(ServiceAO)

    const container1 = new SystemContainer(reg.withService(ServiceA, ServiceAO))
    expect(container1.getInstance(ServiceAO)).toBe(container1.getInstance(ServiceA))
    expect(container1.getInstance(ServiceA)).toBeInstanceOf(ServiceAO)
  })

  it("get instance when does not exist in system", () => {
    const container = new SystemContainer(new SystemRegistry())
    const serviceA = container.getInstance(ServiceA)
    expect(serviceA).toBeInstanceOf(ServiceA)

    const instances = container.findAllInstances(isAny)
    expect(instances.length).toBe(4)
    expect(instances[0]).toBeInstanceOf(ConfigA)
    expect(instances[1]).toBeInstanceOf(ConfigB)
    expect(instances[2]).toBeInstanceOf(Logger)
    expect(instances[3]).toBeInstanceOf(ServiceA)
  })

  it("get instance starts all created services", async() => {
    startupMock.mockResolvedValueOnce("1").mockResolvedValueOnce("2")

    const container = new SystemContainer(new SystemRegistry())
    const serviceB = await container.getInstanceAndStartup(ServiceB)
    expect(serviceB).toBeInstanceOf(ServiceB)
    expect(startupMock).toHaveBeenCalledTimes(2)
    expect(container.findAllInstances(isAny).length).toBe(4)
  })

  it("get instance with cyclic dependencies", () => {
    const container = new SystemContainer(new SystemRegistry())
    expect(() => container.getInstance(ServiceBCyclic)).toThrow(CyclicDependenciesException)
  })

  it("startup service when not running", async() => {
    const serviceB = container.getInstance(ServiceB)
    await container.startupService(serviceB)
    expect(startupMock).toHaveBeenCalledTimes(1)
  })

  it("startup service when already running does nothing", async() => {
    const serviceB = container.getInstance(ServiceB)
    await container.startupService(serviceB)
    await container.startupService(serviceB)
    expect(startupMock).toHaveBeenCalledTimes(1)
  })

  it("shutdown service when already running", async() => {
    const serviceB = container.getInstance(ServiceB)
    await container.startupService(serviceB)
    await container.shutdownService(serviceB)
    expect(startupMock).toHaveBeenCalledTimes(1)
    expect(shutdownMock).toHaveBeenCalledTimes(1)
  })

  it("shutdown service when not running does nothing", async() => {
    const serviceB = container.getInstance(ServiceB)
    await container.shutdownService(serviceB)
    expect(shutdownMock).toHaveBeenCalledTimes(0)
  })

})
