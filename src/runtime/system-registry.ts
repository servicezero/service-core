import Logger from "@service-core/logging/logger"
import { asyncTimeout } from "@service-core/runtime/async"
import { createException } from "@service-core/runtime/exceptions"

export interface ICtor<T>{
  new (...args: any[]): T
}

export interface IConfigCtor<T, K extends string>{
  readonly configNamespace: string extends K ? never : K
  new (...args: any[]): T
}

export function isConfigCtor(o: any): o is IConfigCtor<any, any>{
  return o !== null && o !== undefined && typeof o.configNamespace === "string"
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

export interface ISystemServiceExternalHealthCheck{
  /**
   * Healthcheck method for external services not in
   * control by this node process, such as databases.
   * @return true if health check succeeding
   */
  externalHealthCheck(): Promise<boolean>
}

export interface ISystemService extends Partial<ISystemServiceShutdown>, Partial<ISystemServiceStartup>, Partial<ISystemServiceExternalHealthCheck>{
}

export type IEnvMode = "default" | "dev" | "dockerdev" | "pr" | "pt" | "qa" | "sbx" | "si" | "test"

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

export function hasExternalHealthCheck(o: any): o is ISystemServiceExternalHealthCheck{
  return o !== null && typeof o === "object" && typeof o.externalHealthCheck === "function"
}

export const CyclicDependenciesException = createException("CyclicDependenciesException")

type IMergeEnvConfig<A, B, K extends string> = Omit<A, K> & Record<K, B>
type IMergeEnvConfigs<A, B> = B & Omit<A, keyof B>
type IEnvConfigOpt<T, Prefix extends string> = {
  readonly [K in keyof T as `${ Prefix }.${ K & string }`]?: T[K]
}
type IEnvConfigKeys<T> = {
  readonly [P in keyof T]: IEnvConfigOpt<T[P], P & string>
}
type IEnvConfig<T> = IEnvConfigKeys<T>[keyof IEnvConfigKeys<T>]

function mergeCtors(list: Set<ICtor<any>>, clazz: ICtor<any>){
  let parent = clazz
  while(parent && parent !== Object){
    list.delete(parent)
    parent = Object.getPrototypeOf(parent)
  }
  list.add(clazz)
  return list
}

function isParentClass(lookup: ICtor<any>, other: ICtor<any>){
  let parent = other
  while(parent && parent !== Object){
    if(parent === lookup){
      return true
    }
    parent = Object.getPrototypeOf(parent)
  }
  return false
}

export class SystemRegistry<EnvConfig = {}>{
  /**
   * @param services A list of all service classes in the registry.
   * @param configs A list of all configuration instances in the registry.
   * @param envConfigs Environment configurations
   */
  constructor(
    readonly services: ReadonlySet<ISystemServiceClass<any>> = new Set(),
    readonly configs: ReadonlySet<ICtor<any>> = new Set(),
    readonly envConfigs: ReadonlyMap<IEnvMode | string, IEnvConfig<EnvConfig>> = new Map(),
  ){}

  /**
   * Registers a configuration instance that services will use to configure themselves.
   * This is an immutable operation which returns a new instance of {@link SystemRegistry}
   * @param config The configuration instance to add into the current registry
   */
  withConfig<T, K extends string>(config: IConfigCtor<T, K>): SystemRegistry<IMergeEnvConfig<EnvConfig, T, K>>{
    const configs = new Set(this.configs)
    mergeCtors(configs, config)
    return new SystemRegistry(this.services, configs, this.envConfigs as any)
  }

  /**
   * Registers an environment configuration for all configuration in the system.
   * All configurations will extend off default configuration which extends off the initial
   * class instance configuration
   * @param env The environment to override configuration for
   * @param config The optional overrides
   * @param merge If true will merge with previous env config, false will replace entire env config
   */
  withEnvConfig<E extends IEnvMode | string>(env: E, config: IEnvConfig<EnvConfig>, merge = true){
    const currentConfig = this.envConfigs.get(env)
    const nextConfig = merge ? { ...currentConfig, ...config } : config
    const confs = new Map(this.envConfigs)
    confs.set(env, nextConfig)
    return new SystemRegistry(this.services, this.configs, confs)
  }

  /**
   * Registers multiple configs and services that are contained within
   * the given registry.
   * This is an immutable operation which returns a new instance of {@link SystemRegistry}
   * @param registry The registry to merge into the current registry
   */
  withRegistry<C>(registry: SystemRegistry<C>): SystemRegistry<IMergeEnvConfigs<EnvConfig, C>>{
    const services = new Set(this.services)
    for(const cls of registry.services){
      mergeCtors(services, cls)
    }

    const configs = new Set(this.configs)
    for(const cls of registry.configs){
      mergeCtors(configs, cls)
    }

    const envConfs = new Map(this.envConfigs)
    for(const [ env, conf ] of registry.envConfigs){
      const currentConfig = envConfs.get(env)
      const nextConfig = { ...currentConfig, ...conf }
      envConfs.set(env, nextConfig as any)
    }

    return new SystemRegistry(services, configs, envConfs as any)
  }

  /**
   * Registers a service class that will be automatically started when the system starts
   * This is an immutable operation which returns a new instance of {@link SystemRegistry}
   * @param service The service class to add into the current registry
   */
  withService(service: ISystemServiceClass<any>): SystemRegistry<EnvConfig>{
    const services = new Set(this.services)
    mergeCtors(services, service)
    return new SystemRegistry(services, this.configs, this.envConfigs)
  }
}

export class SystemContainer<EnvConfig = {}>{
  protected readonly cachedClassLookups: Map<ICtor<any>, ICtor<any>> = new Map()
  protected readonly instances: Map<ISystemServiceClass<any>, ISystemService> = new Map()
  protected readonly running: Set<ISystemService> = new Set()

  constructor(protected readonly registry: SystemRegistry<EnvConfig>){}

  protected getClassByPrototypes(lookupClass: ISystemServiceClass<any>): ISystemServiceClass<any>{
    if(this.cachedClassLookups.has(lookupClass)){
      return this.cachedClassLookups.get(lookupClass)!
    }
    const classes = new Set([ ...this.registry.configs, ...this.registry.services ])
    // search configs first
    for(const cls of classes){
      if(isParentClass(lookupClass, cls)){
        this.cachedClassLookups.set(lookupClass, cls)
        return cls
      }
    }
    this.cachedClassLookups.set(lookupClass, lookupClass)
    return lookupClass
  }

  protected getInstanceInternal<T>(serviceClass: ISystemServiceClass<T>){
    const created = new Set<any>()

    const recursive = (lookupClass: ISystemServiceClass<any>, passedThrough: ReadonlySet<ISystemServiceClass<any>> = new Set()) => {
      const clazz = this.getClassByPrototypes(lookupClass)
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
    // fastest is look for a specific instance
    const found = this.instances.get(serviceClass)
    if(found){
      return found as T
    }
    // otherwise walk instance list and find
    // another instance that is an instance of that instance
    for(const instance of this.instances.values()){
      if(instance instanceof serviceClass){
        return instance as any
      }
    }
    return undefined
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

    await asyncTimeout(service.shutdown(), 30000)
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

    await asyncTimeout(service.startup(), 30000)
    this.running.add(service)
    return true
  }
}
