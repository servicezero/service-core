import Logger from "@service-core/logging/logger"
import { asyncTimeout } from "@service-core/runtime/async"
import { createException } from "@service-core/runtime/exceptions"

interface ICtor<T>{
  new (...args: any[]): T
}

export interface ISystemServiceShutdown{
  /**
   * Graceful shutdown of the service executed when
   * the system is shutting down. The system will wait
   * for this promise to resolve before progressing
   * to shutdown the next service
   */
  shutdown(): Promise<void>
}

export interface ISystemServiceStartup{
  /**
   * Executed on startup of system.
   * The system will wait for this promise to
   * resolve before progressing to startup the next service
   */
  startup(): Promise<void>
}

export interface ISystemService extends Partial<ISystemServiceShutdown>, Partial<ISystemServiceStartup>{
}

interface ISystemServiceClass<T extends ISystemService>{
  /**
   * Dependency injectors
   */
  readonly inject?: readonly ISystemServiceClass<any>[]
  new (...args: readonly any[]): T
}

export function hasShutdown(o: any): o is ISystemServiceShutdown{
  return o !== null && typeof o === "object" && typeof o.shutdown === "function"
}

export function hasStartup(o: any): o is ISystemServiceStartup{
  return o !== null && typeof o === "object" && typeof o.startup === "function"
}

export const CyclicDependenciesException = createException("CyclicDependenciesException")

export class SystemRegistry{
  /**
   * @param services A list of all service classes in the registry.
   * @param configs A list of all configuration instances in the registry.
   */
  constructor(
    readonly services: ReadonlyMap<ISystemServiceClass<any>, ISystemServiceClass<any>> = new Map(),
    readonly configs: ReadonlyMap<ICtor<any>, any> = new Map(),
  ){}

  /**
   * Registers a configuration instance that services will use to configure themselves.
   * This is an immutable operation which returns a new instance of {@link SystemRegistry}
   * @param overrideClass Class to override config for. Use this if
   * you have extended a base config class and intend on replacing the base config
   * with this config
   * @param config The configuration instance to add into the current registry
   */
  withConfig<A, B extends A>(overrideClass: ICtor<A>, config: B): SystemRegistry
  /**
   * Registers a configuration instance that services will use to configure themselves.
   * This is an immutable operation which returns a new instance of {@link SystemRegistry}
   * @param config The configuration instance to add into the current registry
   */
  withConfig<T>(config: T): SystemRegistry
  withConfig(overrideClassOrConfig: any, configOrNothing?: any): SystemRegistry{
    const overrideClass = configOrNothing ? overrideClassOrConfig : overrideClassOrConfig.constructor
    const config = configOrNothing ?? overrideClassOrConfig

    const configs = new Map(this.configs)
    configs.set(overrideClass, config)

    return new SystemRegistry(this.services, configs)
  }

  /**
   * Registers multiple configs and services that are contained within
   * the given registry.
   * This is an immutable operation which returns a new instance of {@link SystemRegistry}
   * @param registry The registry to merge into the current registry
   */
  withRegistry(registry: SystemRegistry): SystemRegistry{
    const services = new Map(this.services)
    for(const [ cls, serviceCls ] of registry.services){
      services.set(cls, serviceCls)
    }

    const configs = new Map(this.configs)
    for(const [ cls, config ] of registry.configs){
      configs.set(cls, config)
    }

    return new SystemRegistry(services, configs)
  }

  /**
   * Registers a service class that will be automatically started when the system starts
   * This is an immutable operation which returns a new instance of {@link SystemRegistry}
   * @param overrideClass Class to override service for. Use this if
   * you have extended a base service class and intend on replacing the base service
   * with this service
   * @param service The service class to add into the current registry
   */
  withService<A, B extends A>(overrideClass: ICtor<A>, service: ISystemServiceClass<B>): SystemRegistry
  /**
   * Registers a service class that will be automatically started when the system starts
   * This is an immutable operation which returns a new instance of {@link SystemRegistry}
   * @param service The service class to add into the current registry
   */
  withService(service: ISystemServiceClass<any>): SystemRegistry
  withService(overrideClass: any, serviceOrNothing?: any): SystemRegistry{
    const service = serviceOrNothing ?? overrideClass

    const services = new Map(this.services)
    services.set(overrideClass, service)

    return new SystemRegistry(services, this.configs)
  }
}

export class SystemContainer{
  protected readonly instances: Map<ISystemServiceClass<any>, ISystemService> = new Map()
  protected readonly running: Set<ISystemService> = new Set()

  constructor(protected readonly registry: SystemRegistry){}

  protected getInstanceInternal<T>(serviceClass: ISystemServiceClass<T>){
    const created = new Set<any>()

    const recursive = (lookupClass: ISystemServiceClass<any>, passedThrough: ReadonlySet<ISystemServiceClass<any>> = new Set()) => {
      // ensure we are using the override class type
      const clazz = this.registry.services.get(lookupClass) ?? lookupClass

      // check for cyclic dependencies
      if(passedThrough.has(clazz)){
        const depGraph = [ ...Array.from(passedThrough), clazz ].map(c => c.name).join(" -> ")
        throw new CyclicDependenciesException(`Cyclic dependencies found in graph ${ depGraph }`)
      }
      // add to cyclic dep
      const nextPassedThrough = new Set(passedThrough)
      nextPassedThrough.add(clazz)
      // find existing instance
      const found = this.findInstance(clazz)
      if(found)return found as T
      // instantiate and inject dependencies
      const deps = clazz.inject ? clazz.inject.map(c => {
        const dep = recursive(c, nextPassedThrough)
        // for loggers always bind to class under construction
        if(dep instanceof Logger){
          return dep.withLabels({
            className: clazz.name,
          })
        }
        return dep
      }) : []
      const instance: any = new clazz(...deps)
      created.add(instance)
      // store in map
      this.instances.set(clazz, instance)
      // return instance
      return instance
    }
    const service = recursive(serviceClass)
    return {
      created,
      service,
    }
  }

  /**
   * Finds all instances within the system container which match the given predicate
   * @param predicate The predicate to test for equality of instance
   */
  findAllInstances<T>(predicate: (o: any) => o is T): readonly T[]{
    return Array.from(this.instances.values()).filter(predicate)
  }

  /**
   * Finds an instance within the system container by the given class type.
   * This uses a match where instance instanceof serviceClass
   * @param serviceClass
   */
  findInstance<T>(serviceClass: ISystemServiceClass<T>): T | undefined{
    // find existing instance
    const found = this.instances.get(serviceClass)
    if(found)return found as T
  }

  /**
   * Retrieves an instance of the service class within the system container.
   * If an instance has already been created it will return the existing instance in
   * all cases except for {@link Logger} which is bound to the class which is injecting it.
   * If a service was not previously registered within the system registry it will be instantiated.
   * @param serviceClass
   */
  getInstance<T>(serviceClass: ISystemServiceClass<T>): T{
    return this.getInstanceInternal(serviceClass).service
  }

  /**
   * Retrieves an instance of the service class within the system container.
   * If an instance has already been created it will return the existing instance in
   * all cases except for {@link Logger} which is bound to the class which is injecting it.
   * If a service was not previously registered within the system registry it will be instantiated
   * and have it's startup process executed.
   * @param serviceClass
   */
  async getInstanceAndStartup<T>(serviceClass: ISystemServiceClass<T>): Promise<T>{
    const { created, service } = this.getInstanceInternal(serviceClass)
    // startup all created services
    for(const inst of created){
      if(hasStartup(inst)){
        await this.startupService(inst)
      }
    }
    return service
  }

  /**
   * Shuts down a service if necessary. If service is not already running will not
   * shut down
   * @param service The service to shutdown
   * @return True if service successfully shutdown, false if service is not running
   * @throws TimeoutException When promise is not resolved within timeout period
   */
  async shutdownService<T extends ISystemServiceShutdown>(service: T): Promise<boolean>{
    if(!this.running.has(service)){
      return false
    }

    await asyncTimeout(service.shutdown())
    this.running.delete(service)
    return true
  }

  /**
   * Starts up a service if necessary. If service is already running will not
   * start again
   * @param service The service to start
   * @return True if service successfully started, false if service is already running
   * @throws TimeoutException When promise is not resolved within timeout period
   */
  async startupService<T extends ISystemServiceStartup>(service: T): Promise<boolean>{
    if(this.running.has(service)){
      return false
    }

    await asyncTimeout(service.startup())
    this.running.add(service)
    return true
  }
}
