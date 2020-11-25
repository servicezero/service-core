import type Logger from "@service-core/logging/logger"
import { gracefulShutdown } from "@service-core/runtime/process"
import {
  SystemContainer,
  SystemRegistry,
  hasShutdown,
  hasStartup,
} from "@service-core/runtime/system-registry"

export class System extends SystemContainer{
  protected isRunning = false
  protected readonly log: Logger

  constructor(
    log: Logger,
    registry: SystemRegistry,
    proc: NodeJS.Process = process,
  ){
    super(registry)
    this.log = log.withLabels({
      className: System.name,
    })
    // install gracefull shutdown procedure
    gracefulShutdown(log, () => this.shutdown(), proc)
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
    // register configs
    const { configs, services } = this.registry
    for(const [ cls, config ] of configs){
      this.instances.set(cls as any, config as any)
      this.instances.set(config.constructor as any, config as any)
    }
    // Instantiate all services
    const instances = Array.from(services!.keys()).map(c => this.getInstance(c))
    // Startup services
    const startableServices = instances.filter(hasStartup)
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
