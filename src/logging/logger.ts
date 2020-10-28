/* eslint-disable no-console */
import { AsyncLocalStorage } from "async_hooks"

export interface ILogLabels{
  readonly [key: string]: string
}
export interface ILogEntry{
  readonly message: string
  readonly params?: object
  readonly severity: Severity
  readonly timestamp: string
  readonly [key: string]: any
}
export interface ILogRedactor{
  /**
   * Method to test if property should be redacted
   * @param property
   * @param value
   * @return Return true to redact property, false otherwise
   */
  (property: string, value: any): boolean
}
export interface ILogWriter{
  (entry: ILogEntry): Promise<void>
}

export enum Severity{
  Debug = "Debug",
  Error = "Error",
  Fatal = "Fatal",
  Information = "Information",
  Warning = "Warning",
}

const defaultLogRedactor: ILogRedactor = property => /^(pass|passwords?|phones?|mobiles?|emails?|address)$/i.test(property)

const severityToConsoleMethod: { readonly [P in Severity]: keyof Pick<Console, "debug" | "error" | "info" | "warn"> } = {
  [Severity.Debug]:       "debug",
  [Severity.Information]: "info",
  [Severity.Warning]:     "warn",
  [Severity.Error]:       "error",
  [Severity.Fatal]:       "error",
}
export const consoleLogWriter = (logLabels = false): ILogWriter => async entry => {
  const method = severityToConsoleMethod[entry.severity]
  const { className } = entry
  const msg = `[${ entry.severity }] ${ entry.timestamp }${ className ? ` (${ className }):` : "" } ${ entry.message }`
  if(logLabels){
    console[method](msg, entry)
  }else if(entry.params){
    console[method](msg, entry.params)
  }else{
    console[method](msg)
  }
}
export const dockerLogWriter: ILogWriter = async entry => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry))
}
function composeRedactors(redactors: readonly ILogRedactor[]): ILogRedactor{
  return (property, value) => redactors.some(r => r(property, value))
}

function redact(property: string, value: any, redactor: ILogRedactor): readonly [string, any]{
  return [ property, redactor(property, value) ? "<REDACTED>" : value ]
}

function replaceParams(obj: any, redactor: ILogRedactor): any{
  if(obj === null || obj === undefined){
    return undefined
  }else if(obj instanceof Error){
    return {
      ...obj,
      message: obj.message,
      name:    obj.name,
      stack:   obj.stack,
    }
  }else if(obj instanceof Date){
    return obj.toISOString()
  }else if(obj instanceof Map){
    return Object.fromEntries(Array.from(obj.entries())
      .map(([ k, v ]) => redact(k, replaceParams(v, redactor), redactor)))
  }else if(obj instanceof Set){
    return Array.from(obj.values()).map(v => replaceParams(v, redactor))
  }else if(Array.isArray(obj)){
    return obj.map(v => replaceParams(v, redactor))
  }else if(typeof obj === "object"){
    return Object.fromEntries(Object.entries(obj)
      .map(([ k, v ]) => redact(k, replaceParams(v, redactor), redactor)))
  }else{
    return obj
  }
}

const contextLabels = new AsyncLocalStorage<ILogLabels>()

export default class Logger{
  private readonly redactor: ILogRedactor

  constructor(protected readonly labels: ILogLabels = {},
              protected readonly redactors: readonly ILogRedactor[] = [ defaultLogRedactor ],
  protected readonly logWriter: ILogWriter = consoleLogWriter()){
  this.redactor = composeRedactors(redactors)
}

protected async addLog(severity: Severity, msgOrErr: Error | string, structuredParams?: object){
  const message = msgOrErr instanceof Error ? msgOrErr.message : msgOrErr
  const params: any = msgOrErr instanceof Error ? structuredParams ?? msgOrErr : structuredParams
  const ctxLabels = contextLabels.getStore()
  const json = {
    ...this.labels,
    ...ctxLabels,
    message,
    params:    replaceParams(params, this.redactor),
    severity,
    timestamp: new Date().toISOString(),
  }
  try{
    await this.logWriter(json)
  } catch(e){
    // eslint-disable-next-line no-console
    console.error("Failed to write log entry", e)
  }
}

debug(message: string, structuredParams?: object){
  return this.addLog(Severity.Debug, message, structuredParams)
}

error(message: Error | string, structuredParams?: object){
  return this.addLog(Severity.Error, message, structuredParams)
}

fatal(message: Error | string, structuredParams?: object){
  return this.addLog(Severity.Fatal, message, structuredParams)
}

info(message: string, structuredParams?: object){
  return this.addLog(Severity.Information, message, structuredParams)
}

warn(message: string, structuredParams?: object){
  return this.addLog(Severity.Warning, message, structuredParams)
}

/**
 * This will create an async bound context to carry across any
 * labels defined into all logs carried out inside this async execution
 * @param labels The context labels
 * @param fn The function to run within async context
 */
withContext<R>(labels: ILogLabels, fn: () => R): R{
  return contextLabels.run(labels, () => fn())
}

/**
 * Creates a new logger merging the existing labels
 * with new labels. Use this for context bound loggers
 * @param labels
 * @param ignoreCurrentLabels Optional, if true then does not keep existing labels.
 * Defaults to false to keep existing labels
 */
withLabels(labels: ILogLabels, ignoreCurrentLabels = false): Logger{
  if(ignoreCurrentLabels){
    return new Logger(labels, this.redactors, this.logWriter)
  }
  return new Logger({ ...this.labels, ...labels }, this.redactors, this.logWriter)
}

/**
 * Creates a new logger merging the existing redactors
 * with new redactors. Use this for context bound loggers
 * @param redactors
 * @param ignoreCurrentRedactors Optional, if true then does not keep existing redactors.
 * Defaults to false to keep existing redactors
 */
withRedactors(redactors: readonly ILogRedactor[], ignoreCurrentRedactors = false): Logger{
  if(ignoreCurrentRedactors){
    return new Logger(this.labels, redactors, this.logWriter)
  }
  return new Logger(this.labels, [ ...this.redactors, ...redactors ], this.logWriter)
}
}
