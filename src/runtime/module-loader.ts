import path from "path"
import fs from "fs"

interface IResolveContext{
  readonly parentURL?: string
}

interface IResolveResult{
  readonly url: string
}

interface IFormatResult{
  readonly format: string | "builtin" | "commonjs" | "json" | "module" | "wasm"
}

interface ISourceResult{
  readonly source: SharedArrayBuffer | Uint8Array | string
}

interface ITransformContext extends IResolveResult, IFormatResult{
}

interface IModulePaths{
  readonly moduleName: string
  readonly paths: readonly string[]
  findModule(modulePath: string): string | undefined
}

// find module paths from ts.config.json
const projectDir = process.cwd()
const packageFilePath = path.resolve(projectDir, "package.json")
const packageJson = JSON.parse(fs.readFileSync(packageFilePath, "utf-8"))
// map to absolute paths
const modulePaths = Object.entries(packageJson.modulePaths ?? {}).map(([ moduleName, paths = [] ]): IModulePaths => {
  const mappedPaths = (paths as readonly string[])
    .map(p => path.resolve(projectDir, p))
    .sort((p1, p2) => p2.length - p1.length)

  return {
    findModule: modulePath => {
      if(modulePath.startsWith(moduleName)){
        let lookupFiles: string[]
        const relPath = modulePath.replace(moduleName, "").replace(/^\/+/, "")
        // is index file
        if(relPath === ""){
          lookupFiles = [ "index.mjs", "index.cjs", "index.js" ]
        }else{
          lookupFiles = [
            relPath,
            `${ relPath }.mjs`,
            `${ relPath }.cjs`,
            `${ relPath }.js`,
          ]
        }
        // find any match
        for(const mappedPath of mappedPaths){
          for(const lookupFile of lookupFiles){
            const absFile = path.resolve(mappedPath, lookupFile)
            if(fs.existsSync(absFile)){
              return absFile
            }
          }
        }
      }
      return undefined
    },
    moduleName,
    paths: mappedPaths,
  }
})

function findModule(specifier: string){
  for(const m of modulePaths){
    const file = m.findModule(specifier)
    if(file){
      return {
        file,
        module: m,
      }
    }
  }
  return undefined
}

export async function resolve(specifier: string, context: IResolveContext, defaultResolve: (specifier: string, context: IResolveContext, def: any) => Promise<IResolveResult>): Promise<IResolveResult>{
  // do we have a module path match for specifier
  const matched = findModule(specifier)
  if(matched){
    return {
      url: `file://${ matched.file }`,
    }
  }
  // Defer to Node.js for all other specifiers.
  return defaultResolve(specifier, context, defaultResolve)
}

export async function getFormat(url: string, context: {}, defaultGetFormat: (url: string, context: {}, def: any) => Promise<IFormatResult>): Promise<IFormatResult>{
  // Defer to Node.js for all other URLs.
  return defaultGetFormat(url, context, defaultGetFormat)
}

export async function getSource(url: string, context: IFormatResult, defaultGetSource: (url: string, context: IFormatResult, def: any) => Promise<ISourceResult>): Promise<ISourceResult>{
  // Defer to Node.js for all other formats
  return defaultGetSource(url, context, defaultGetSource)
}

export async function transformSource(source: ISourceResult["source"], context: ITransformContext, defaultTransformSource: (source: ISourceResult["source"], context: ITransformContext, def: any) => Promise<ISourceResult>): Promise<ISourceResult>{
  // Defer to Node.js for all other sources.
  return defaultTransformSource(source, context, defaultTransformSource)
}
