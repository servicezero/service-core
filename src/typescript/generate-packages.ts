/* eslint-disable no-console */
import path from "path"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs"
import { cruise } from "dependency-cruiser"

function getCliArg(prop: string, required: false): string | undefined
function getCliArg(prop: string): string
function getCliArg(prop: string, required = true): string | undefined{
  const idx = process.argv.indexOf("--" + prop)
  const val = idx >= 0 ? process.argv[idx + 1] : undefined
  if(!val && required){
    throw new Error(`Required cli argument is not defined --${ prop }`)
  }
  return val
}

function getEnvArg(prop: string){
  if(!process.env[prop]){
    throw new Error(`Required env var is not defined ${ prop }`)
  }
  return process.env[prop]!
}

function walkDir(rootdir: string, filter?: (file: string) => boolean, dirFilter?: (dir: string) => boolean){
  const files: string[] = []

  const recursiveWalk = (dir: string) => {
    readdirSync(dir).forEach( f => {
      const dirPath = path.join(dir, f)
      const isDirectory = statSync(dirPath).isDirectory()
      if(isDirectory){
        if((!dirFilter || dirFilter(f))){
          recursiveWalk(dirPath)
        }
      }else{
        if(!filter || filter(f)){
          files.push(dirPath)
        }
      }
    })
  }
  recursiveWalk(rootdir)
  return files
}

function loadPackageJson(filePath: string){
  return JSON.parse(readFileSync(filePath, { encoding: "utf-8" }))
}

function loadFirstPackageJson(filePaths: readonly string[]){
  for(const filePath of filePaths){
    if(existsSync(filePath)){
      return loadPackageJson(filePath)
    }
  }
}

function getServicePackageName(packageName: string, serviceName: string){
  return packageName.replace(/\/[^/]+$/i, "/" + serviceName)
}

function getModuleAliases(packageName: string, buildDir: string, serviceNames: readonly string[]){
  return Object.fromEntries(serviceNames.map(serviceName => [
    getServicePackageName(packageName, serviceName),
    [ path.resolve(buildDir, serviceName) ],
  ]))
}

function getUsedModules(buildDir: string, modulePaths: any, serviceName: string){
  const nodeModulesDir = path.resolve(path.dirname(buildDir), "node_modules")
  // find used dependencies
  const dependencies = cruise([ `${ buildDir }/${ serviceName }` ], {
    exclude: "\\.(spec|int)(\\.d)?\\.([mc]?[tj]s)(\\.map)?$",
  }, {
    alias: modulePaths,
  }).output
  // how do we handle string ??
  if(typeof dependencies === "string"){
    return
  }
  // find node modules used
  const nodeModuleNames = Array.from(new Set(dependencies.modules
    .filter(m => m.source.startsWith("node_modules/"))
    .map(m => {
      if (m.source.startsWith("node_modules/@")){
        return m.source.replace(/^node_modules\/([^/]+)\/([^/]+)\/.+$/, "$1/$2")
      } else {
        return m.source.replace(/^node_modules\/([^/]+)\/.+$/, "$1")
      }
    })))
    .filter(m => rootPackageJsonObj.dependencies.hasOwnProperty(m))
  // find project modules used
  const modulePathEntries = (Object.entries(modulePaths) as ([string, readonly string[]])[])
    // exclude current package
    .filter(m => !m[0].endsWith(`/${ serviceName }`))
  const projectModuleNames = Array.from(new Set(dependencies.modules
    .map(m => path.resolve(m.source))
    .map(m => {
      const mod = modulePathEntries.find(({ 1: v }) => v.some(vs => m.startsWith(vs)))
      return mod?.[0]
    })
    .filter(m => !!m),
  ))
  // find types
  const nodeModuleTypings = nodeModuleNames
    .map(name => `@types/${ name }`)
    .filter(name => existsSync(path.resolve(nodeModulesDir, name)))

  // find project files used
  const usedFiles = Array.from(new Set(dependencies.modules
    .filter(m => m.source.startsWith("build/"))
    .map(m => m.source),
  ))

  return {
    nodeModuleNames: [ ...nodeModuleTypings, ...nodeModuleNames, ...projectModuleNames ].sort() as string[],
    usedFiles,
  }
}

function copyUsedFiles(usedFiles: readonly string[], serviceBuildDir: string, bundleDir: string){
  for(const usedFile of usedFiles){
    const relative = path.relative(serviceBuildDir, usedFile)
    const outFile = path.resolve(bundleDir, relative)
    mkdirSync(path.dirname(outFile), { recursive: true })
    copyFileSync(usedFile, outFile)
    if(existsSync(usedFile + ".map")){
      copyFileSync(usedFile + ".map", outFile + ".map")
    }
  }
}

function copyOtherFiles(serviceDir: string, bundleDir: string){
  // copy other referenced files
  const allFiles = walkDir(serviceDir, f => !/\.([tj]sx?)$/i.test(f), d => !/node_modules/.test(d))
  for(const f of allFiles){
    const relative = path.relative(serviceDir, f)
    const outFile = path.resolve(bundleDir, relative)
    mkdirSync(path.dirname(outFile), { recursive: true })
    copyFileSync(f, outFile)
  }
}

function mergePackageJson(rootPackageJsonObj: any, rootPackageLockJsonObj: any, servicePackageJsonObj: any, bundleDependencies: readonly string[], serviceName: string, projectVer: string){
  const name = getServicePackageName(rootPackageJsonObj.name, serviceName)
  // create updated package json
  const mergedPackageJson = {
    ...rootPackageJsonObj,
    ...servicePackageJsonObj,
    // bundleDependencies,
    dependencies: Object.fromEntries(bundleDependencies.map(dep => {
      const rootPkg = rootPackageJsonObj.dependencies[dep]
      if(rootPkg){
        return [ dep, rootPkg ]
      }else{
        return [ dep, projectVer ]
      }
    })),
    name,
    version: projectVer,
  }
  // clean package json
  delete mergedPackageJson.devDependencies
  delete mergedPackageJson.nodemonConfig
  delete mergedPackageJson.jest
  delete mergedPackageJson.eslintConfig
  delete mergedPackageJson.scripts
  delete mergedPackageJson.modulePaths

  const mergedPackageLockJson = {
    ...rootPackageLockJsonObj,
    name,
    version: projectVer,
  }

  return {
    mergedPackageJson,
    mergedPackageLockJson,
  }
}

const projectDir = path.resolve(getCliArg("project"))
let projectVer = getEnvArg("BUILD_VERSION")
const rootPackageJson = path.resolve(projectDir, "package.json")
const rootPackageJsonObj = loadPackageJson(rootPackageJson)
const rootPackageLockJson = path.resolve(projectDir, "package-lock.json")
const rootPackageLockJsonObj = loadPackageJson(rootPackageLockJson)
// set default version to package version
if(!projectVer){
  projectVer = rootPackageLockJsonObj.version
}

const srcDir = path.resolve(projectDir, "src")
const buildDir = path.resolve(projectDir, "build")
const buildBundlesDir = path.resolve(projectDir, "build/.bundles")
const serviceDirs = readdirSync(srcDir)
  .map(s => path.resolve(srcDir, s))
  .filter(s => statSync(s).isDirectory())
const serviceNames = serviceDirs.map(s => path.relative(srcDir, s))
const moduleAliases = getModuleAliases(rootPackageJsonObj.name, buildDir, serviceNames)

function generatePackage(serviceName: string){
  const serviceDir = path.resolve(srcDir, serviceName)
  const serviceBuildDir = path.resolve(buildDir, serviceName)
  const serviceBundleDir = path.resolve(buildBundlesDir, serviceName)

  mkdirSync(serviceBundleDir, { recursive: true })
  // get used modules
  const used = getUsedModules(buildDir, moduleAliases, serviceName)
  if(used){
    const servicePackageJsonObj = loadFirstPackageJson([
      path.resolve(serviceBuildDir, "package.json"),
      path.resolve(serviceDir, "package.json"),
    ]) ?? {}
    copyUsedFiles(used.usedFiles, serviceBuildDir, serviceBundleDir)
    // copy other files
    copyOtherFiles(serviceDir, serviceBundleDir)
    // create updated package json
    const { mergedPackageJson, mergedPackageLockJson } = mergePackageJson(rootPackageJsonObj, rootPackageLockJsonObj, servicePackageJsonObj, used!.nodeModuleNames, serviceName, projectVer!)
    // write package json
    mkdirSync(serviceBundleDir, { recursive: true })
    writeFileSync(path.resolve(serviceBundleDir, "package.json"), JSON.stringify(mergedPackageJson, undefined, 2), { encoding: "utf-8", flag: "w" })
    writeFileSync(path.resolve(serviceBundleDir, "package-lock.json"), JSON.stringify(mergedPackageLockJson, undefined, 2), { encoding: "utf-8", flag: "w" })
  }
}

for(const serviceName of serviceNames){
  console.log("Generating package bundle", serviceName)
  generatePackage(serviceName)
  console.log("Generated package bundle", serviceName)
}
