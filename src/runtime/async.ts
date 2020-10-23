import { createException } from "@service-core/runtime/exceptions"

export const TimeoutException = createException("TimeoutException")

/**
 * Waits for promise to complete within the timeout period. If promise
 * is not completed in time a {@link TimeoutException} will be thrown
 * @param promise The promise to wait for completion
 * @param delay The delay to wait before timing out
 * @throws TimeoutException When promise is not resolved within timeout period
 */
export async function asyncTimeout<T>(promise: Promise<T>, delay = 5000): Promise<T>{
  let timer: any
  try{
    const result = await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new TimeoutException(`Timed out after ${ delay }ms`)), delay)
      }),
    ])
    return result as T
  } finally{
    clearTimeout(timer)
  }
}
