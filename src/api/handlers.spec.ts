import {
  ApiConfig,
  isApiHandler,
  isApiMiddleware,
} from "@service-core/api/handlers"

class NonApiHandlerA{}
class NonApiHandlerB{
  static api = {}
}

class ApiHandlerA{
  static api = new ApiConfig({} as any, {} as any)
}
class ApiHandlerASub extends ApiHandlerA{}

class NonApiMiddlewareA{}

class ApiMiddlewareA{
  createMiddleware(){
    // nothing
  }
}
class ApiMiddlewareASub extends ApiMiddlewareA{}

it("isApiHandler should be true", () => {
  expect(isApiHandler(new ApiHandlerA())).toBeTruthy()
  expect(isApiHandler(new ApiHandlerASub())).toBeTruthy()
})

it("isApiHandler should be false", () => {
  expect(isApiHandler(new NonApiHandlerA())).toBeFalsy()
  expect(isApiHandler(new NonApiHandlerB())).toBeFalsy()
  expect(isApiHandler(undefined)).toBeFalsy()
})

it("isApiMiddleware should be true", () => {
  expect(isApiMiddleware(new ApiMiddlewareA())).toBeTruthy()
  expect(isApiMiddleware(new ApiMiddlewareASub())).toBeTruthy()
})

it("isApiMiddleware should be false", () => {
  expect(isApiMiddleware(new NonApiMiddlewareA())).toBeFalsy()
  expect(isApiMiddleware(undefined)).toBeFalsy()
})
