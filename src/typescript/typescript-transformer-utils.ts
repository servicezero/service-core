import fs from "fs"
import ts from "typescript"
import type {
  ICustomTransformFactory, ITransformHelpers,
} from "./typescript-transformer-plugins"

export class TypescriptCompileException extends Error{
  constructor(message?: string){
    super(message)
    this.name = this.constructor.name
  }
}

function compileWithOpts<T>(files: Map<string, string>, options: ts.CompilerOptions, transformFactory?: ICustomTransformFactory<T>, transformFactoryOptions?: T): Map<string, string>{
  const srcFiles = new Map<string, ts.SourceFile>()
  const compiledFiles = new Map<string, string>()

  const findFileName = (moduleName: string) => {
    const names = [
      moduleName,
      `${ moduleName }.ts`,
    ]
    return names.find(n => files.has(n))
  }

  const readFile = (fileName: string) => {
    const data = files.get(findFileName(fileName)!)
    if(data)return data
    // otherwise read from file system
    if(fs.existsSync(fileName)){
      return fs.readFileSync(fileName, "utf-8")
    }
  }

  function getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean): ts.SourceFile | undefined{
    // find existing
    const found = srcFiles.get(fileName)
    if(found && !shouldCreateNewSourceFile)return found
    // create new
    const data = readFile(fileName)
    if(!data){
      onError?.(`File does not exist ${ fileName }`)
      return
    }
    const srcFile = ts.createSourceFile(fileName, data, languageVersion, true)
    srcFiles.set(fileName, srcFile)
    return srcFile
  }

  const host = ts.createCompilerHost(options, true)
  const origFileExists = host.fileExists
  host.resolveModuleNames = (moduleNames, containingFile, reusedNames, redirectedReference, opts) => {
    return moduleNames.map(moduleName => {
      const foundFilename = findFileName(moduleName)
      if(foundFilename){
        return {
          resolvedFileName: foundFilename,
        }
      }
      return ts.resolveModuleName(moduleName, containingFile, opts, host, undefined, redirectedReference)?.resolvedModule
    })
  }
  host.fileExists = fileName => {
    return files.has(fileName) || origFileExists(fileName)
  }
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    return getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  }
  host.writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
    compiledFiles.set(fileName, data)
  }
  host.readFile = fileName => {
    return readFile(fileName)
  }

  const diags: ts.Diagnostic[] = []
  const program = ts.createProgram(Array.from(files.keys()), options, host)
  const helpers: ITransformHelpers = {
    addDiagnostic(diag: ts.Diagnostic){
      diags.push(diag)
    },
  }
  const customTransformers = transformFactory?.(program.getTypeChecker(), transformFactoryOptions as any, helpers)
  for(const fileName of files.keys()){
    const emitResult = program.emit(host.getSourceFile(fileName, options.target!), undefined, undefined, false, customTransformers)
    emitResult.diagnostics.forEach(d => diags.push(d))
  }
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(diags)

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file){
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!)
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      // eslint-disable-next-line no-console
      console.log(`${ diagnostic.file.fileName } (${ line + 1 },${ character + 1 }): ${ message }`)
    } else {
      // eslint-disable-next-line no-console
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    }
  })
  if(allDiagnostics.length > 0){
    throw new TypescriptCompileException("Typescript compilation failed")
  }
  return compiledFiles
}

export function compile<T>(files: Map<string, string>, options?: ts.CompilerOptions, transformFactory?: ICustomTransformFactory<T>, transformFactoryOptions?: T): Map<string, string>{
  return compileWithOpts(files, {
    module:           ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    noEmitOnError:    true,
    noImplicitAny:    true,
    target:           ts.ScriptTarget.ES2017,
    ...options,
  }, transformFactory, transformFactoryOptions)
}
