import Logger, { Severity } from "@service-core/logging/logger"

const mockLogWriter = jest.fn()

type ILogMethods = keyof Pick<Logger, "debug" | "error" | "fatal" | "info" | "warn">

const timestampMatcher = expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)

describe("Logger", () => {
  const logger = new Logger({ a: "A", "test.b": "B" }, undefined, mockLogWriter)

  async function verifyLog(method: ILogMethods, severity: Severity){
    await logger[method]("Test msg", { email: "foo@bar.com", foo: "bar" })
    expect(mockLogWriter).toHaveBeenCalledTimes(1)
    expect(mockLogWriter).toHaveBeenCalledWith({
      a:       "A",
      message: "Test msg",
      params:  {
        email: "<REDACTED>",
        foo:   "bar",
      },
      severity,
      "test.b":  "B",
      timestamp: timestampMatcher,
    })
  }

  it("logs debug messages", async() => await verifyLog("debug", Severity.Debug))
  it("logs info messages", async() => await verifyLog("info", Severity.Information))
  it("logs error messages", async() => await verifyLog("error", Severity.Error))
  it("logs warn messages", async() => await verifyLog("warn", Severity.Warning))
  it("logs fatal messages", async() => await verifyLog("fatal", Severity.Fatal))

  it("logs error object as message", async() => {
    await logger
      .withLabels({}, true)
      .withRedactors([ property => property === "foo" ], true)
      .error(new Error("Some err"), { foo: "bar" })
    expect(mockLogWriter).toHaveBeenCalledTimes(1)
    expect(mockLogWriter).toHaveBeenCalledWith({
      message: "Some err",
      params:  {
        foo: "<REDACTED>",
      },
      severity:  Severity.Error,
      timestamp: timestampMatcher,
    })
  })

  it("with extra labels and redactors", async() => {
    await logger
      .withLabels({ extra: "foo" })
      .withRedactors([ (property, value) => value === "bar" ])
      .info("test", { foo: "bar" })
    expect(mockLogWriter).toHaveBeenCalledTimes(1)
    expect(mockLogWriter).toHaveBeenCalledWith({
      a:       "A",
      extra:   "foo",
      message: "test",
      params:  {
        foo: "<REDACTED>",
      },
      severity:  Severity.Information,
      "test.b":  "B",
      timestamp: timestampMatcher,
    })
  })

  it("with no params", async() => {
    await logger
      .withLabels({}, true)
      .info("test")
    expect(mockLogWriter).toHaveBeenCalledTimes(1)
    expect(mockLogWriter).toHaveBeenCalledWith({
      message:   "test",
      severity:  Severity.Information,
      timestamp: timestampMatcher,
    })
  })

  it("converts all values into valid params object", async() => {
    await logger
      .withLabels({}, true)
      .info("test", {
        arr: [ 10, "erg", {
          bar:   "foo",
          email: "bla@bla.com",
        } ],
        dateTime: new Date("2021-01-02T01:02:03.000Z"),
        emails:   [ "a@a.com", "f@f.com" ],
        err:      new Error("Bad format"),
        foo:      "bar",
        keys:     new Map<any, any>([
          [ "k1", "ee" ],
          [ "k2", { email: "aa@a.com", name: "smith" } ],
        ]),
        names: new Set<any>([ {
          name: "john",
          pass: "1234",
        }, "erg" ]),
        obj: {
          phone: "1234",
          six:   6,
        },
        ten: 10,
      })
    expect(mockLogWriter).toHaveBeenCalledTimes(1)
    expect(mockLogWriter).toHaveBeenCalledWith({
      message: "test",
      params:  {
        arr: [ 10, "erg", {
          bar:   "foo",
          email: "<REDACTED>",
        } ],
        dateTime: "2021-01-02T01:02:03.000Z",
        emails:   "<REDACTED>",
        err:      {
          message: "Bad format",
          name:    "Error",
          stack:   expect.any(String),
        },
        foo:  "bar",
        keys: {
          k1: "ee",
          k2: { email: "<REDACTED>", name: "smith" },
        },
        names: [ {
          name: "john",
          pass: "<REDACTED>",
        }, "erg" ],
        obj: {
          phone: "<REDACTED>",
          six:   6,
        },
        ten: 10,
      },
      severity:  Severity.Information,
      timestamp: timestampMatcher,
    })
  })

})
