import type Logger from "@service-core/logging/logger"
import { gracefulShutdown } from "@service-core/runtime/process"
import {
  IConfigCtor,
  IEnvMode,
  SystemContainer,
  SystemRegistry,
  hasShutdown,
  hasStartup,
  isConfigCtor,
} from "@service-core/runtime/system-registry"
import { deserializeTypeFromJson } from "@service-core/runtime/type-serializer"

export class System<EnvConfig = {}> extends SystemContainer<EnvConfig>{
  protected isRunning = false
  protected readonly log: Logger

  constructor(
    log: Logger,
    registry: SystemRegistry<EnvConfig>,
    protected readonly env: IEnvMode = "dev",
    protected readonly proc: NodeJS.Process = process,
  ){
    super(registry)
    this.log = log.withLabels({
      className: System.name,
    })
    // install gracefull shutdown procedure
    gracefulShutdown(log, () => this.shutdown(), proc)
  }

  protected createConfigInstance(envConf: Record<string, any>, cls: IConfigCtor<any, any>){
    // extract all properties for the config
    const prefix = `${ cls.configNamespace }.`
    const props = Object.fromEntries(
      Object.entries(envConf)
        .filter(([ k ]) => k.startsWith(prefix))
        .map(([ k, v ]) => [ k.replace(prefix, ""), v ]),
    )
    return deserializeTypeFromJson(cls, props)
  }

  protected createEnvBoundConfig(){
    // merge env configs
    const envConf: Record<string, any> = {
      ...this.registry.envConfigs.get("default"),
      ...this.registry.envConfigs.get(this.env),
    }
    // find environment variable overrides
    const envVars = new Map(Object.entries(this.proc.env ?? {}).map(([ k, v ]) => [ k.toLowerCase(), v ]))
    // override with environment variable
    for(const cls of this.registry.configs){
      if(isConfigCtor(cls) && cls.class){
        for(const key of Object.keys(cls.class)){
          const envKey = `${ cls.configNamespace }.${ key }`
          const envVal = envVars.get(envKey.toLowerCase())
          if(envVal !== null && envVal !== undefined){
            envConf[envKey] = envVal
          }
        }
      }
    }
    return envConf
  }

  /**
   * Shutdown the entire system and all services running.
   * If any service fails to shutdown it will be skipped and continue the shutdown
   * process of the entire system. If system is already shutdown calling this
   * will do nothing.
   */
  async shutdown(): Promise<void>{
    // if not running then do nothing
    if(!this.isRunning){
      return
    }

    this.isRunning = false
    await this.log.info("System shutting down...")
    for(const service of this.running){
      try{
        if(hasShutdown(service)){
          await this.shutdownService(service)
        }
      } catch(e){
        await this.log.error(`Failed to shutdown service ${ service.constructor.name }, skipping`, e)
      }
    }
    this.running.clear()
    this.instances.clear()
    await this.log.info("System shutdown")
  }

  /**
   * Startup the entire system and all services in the system registry.
   * If any service fails to start initially it will trigger the shutdown
   * process of the entire system. If system is already started calling this
   * will do nothing.
   */
  async startup(): Promise<void>{
    // if already running then do nothing
    if(this.isRunning){
      return
    }

    this.isRunning = true
    await this.log.info("System starting...")
    this.instances.set(this.log.constructor as any, this.log as any)
    this.instances.set(System, this)
    this.instances.set(SystemContainer, this)
    const { configs, services } = this.registry
    // merge env configs
    const envConf = this.createEnvBoundConfig()
    // register configs
    for(const cls of configs){
      const config = this.createConfigInstance(envConf, cls as any)
      this.instances.set(cls as any, config as any)
    }
    // Instantiate all services
    for(const c of services){
      this.getInstance(c)
    }
    // Startup services
    const startableServices = Array.from(this.instances.values()).filter(hasStartup)
    for(const service of startableServices){
      try{
        await this.startupService(service)
      } catch(e){
        await this.log.error(`Failed to startup service ${ service.constructor.name }, shutting down`, e)
        await this.shutdown()
        return
      }
    }
    await this.log.info("System started")
  }
}
