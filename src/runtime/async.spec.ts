import {
  TimeoutException,
  asyncTimeout,
} from "@service-core/runtime/async"

const defer = () => {
  let resolve!: (value?: any) => void
  let reject!: (err?: any) => void

  const promise = new Promise<any>((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    reject,
    resolve,
  }
}

describe("asyncTimeout", () => {
  it("resolves within timeout period should clear timeout and return resolved data", async() => {
    const { promise, resolve } = defer()
    const resultPromise = asyncTimeout(promise, 100)
    resolve("v1")
    await expect(resultPromise).resolves.toEqual("v1")
    expect(jest.getTimerCount()).toBe(0)
  })

  it("does not resolve within timeout period should throw timeout exception", async() => {
    const { promise } = defer()
    const resultPromise = asyncTimeout(promise, 100)
    jest.advanceTimersByTime(101)
    await expect(resultPromise).rejects.toThrow(TimeoutException)
    expect(jest.getTimerCount()).toBe(0)
  })

  it("rejects within timeout period should clear timeout and throw exception", async() => {
    const { promise, reject } = defer()
    const resultPromise = asyncTimeout(promise, 100)
    reject(new Error("failed"))
    await expect(resultPromise).rejects.toThrow("failed")
    expect(jest.getTimerCount()).toBe(0)
  })
})
