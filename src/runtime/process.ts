import type Logger from "@service-core/logging/logger"

export function gracefulShutdown(log: Logger, customShutdown: () => Promise<void>, proc: NodeJS.Process = process){
  const flush = async() => {
    try{
      await customShutdown()
    }catch(e){
      await log.fatal(e)
    }
    proc.off("SIGINT", onShutDown)
    proc.off("SIGTERM", onShutDown)
    proc.off("SIGUSR1", onShutDown)
    proc.off("SIGUSR2", onShutDown)
    proc.off("uncaughtException", onUncaughtException)
    proc.off("unhandledRejection", onUnhandledRejection)
    proc.off("beforeExit", flush)
  }
  const onException = (msg: string) => async(error: any) => {
    await log.error(msg, error)
    await onShutDown(1)
  }
  const onUncaughtException = onException("Uncaught exception")
  const onUnhandledRejection = onException("Unhandled rejection")
  const onShutDown = async(exitCode: 0 | 1 = 0) => {
    await flush()
    proc.exit(exitCode)
  }
  // catches ctrl+c event
  proc.on("SIGINT", onShutDown)
  proc.on("SIGTERM", onShutDown)
  // catches "kill pid" (for example: nodemon restart)
  proc.on("SIGUSR1", onShutDown)
  proc.on("SIGUSR2", onShutDown)
  // catches uncaught exceptions
  proc.on("uncaughtException", onUncaughtException)
  proc.on("unhandledRejection", onUnhandledRejection)
  proc.on("beforeExit", flush)
}
