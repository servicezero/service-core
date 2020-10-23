import { gracefulShutdown } from "@service-core/runtime/process"
import EventEmitter from "events"

const mockLog = {
  error: jest.fn(),
  fatal: jest.fn(),
}

class MockProcess extends EventEmitter{
  exit = jest.fn()
}
const mockShutdown = jest.fn()

const waitNextLoop = () => new Promise(setImmediate)
const eventNames = [
  "SIGINT",
  "SIGTERM",
  "SIGUSR1",
  "SIGUSR2",
  "uncaughtException",
  "unhandledRejection",
  "beforeExit",
]
describe("gracefulShutdown", () => {

  let proc: MockProcess

  beforeEach(() => {
    jest.useRealTimers()
    proc = new MockProcess()
    mockLog.fatal.mockResolvedValue(true)
    mockLog.error.mockResolvedValue(true)
    mockShutdown.mockResolvedValue(true)
  })

  const signals: [string, number][] = [
    [ "SIGINT", 0 ],
    [ "SIGTERM", 0 ],
    [ "SIGUSR1", 0 ],
    [ "SIGUSR2", 0 ],
    [ "uncaughtException", 1 ],
    [ "unhandledRejection", 1 ],
  ]

  async function execShutdown(sig: string, code?: number, failShutdown?: boolean){
    if(failShutdown){
      mockShutdown.mockImplementation(() => Promise.reject(new Error("failed")))
    }
    gracefulShutdown(mockLog as any, mockShutdown, proc as any)
    proc.emit(sig)
    await waitNextLoop()
    expect(mockShutdown).toHaveBeenCalledTimes(1)
    // events should have been removed
    eventNames.forEach(evt => expect(proc.listenerCount(evt)).toBe(0))
    // exit code 0 should have been called
    if(code === undefined){
      expect(proc.exit).toHaveBeenCalledTimes(0)
    }else{
      expect(proc.exit).toHaveBeenCalledWith(code)
    }
    expect(mockLog.error).toHaveBeenCalledTimes(code === 0 || code === undefined ? 0 : 1)
    expect(mockLog.fatal).toHaveBeenCalledTimes(failShutdown ? 1 : 0)
  }

  it.each(signals)("shutdown process triggered by signal '%p' should have terminated with exit code %p", async(sig, code) => {
    await execShutdown(sig, code)
  })

  it("failed shutdown log fatal error", async() => {
    await execShutdown("SIGINT", 0, true)
  })

  it("beforeExit signal should not exit process", async() => {
    await execShutdown("beforeExit")
  })
})
