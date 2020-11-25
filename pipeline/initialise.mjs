import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from "fs"
import path from "path"

function loadPackageJson(filePath){
  if(existsSync(filePath)){
    return JSON.parse(readFileSync(filePath, { encoding: "utf-8" }))
  }
}

const srcDir = path.resolve("src")
const buildDir = path.resolve("build")
// copy package.json of each service that
// has defined custom settings
readdirSync(srcDir)
  .map(s => path.resolve(srcDir, s))
  .filter(s => statSync(s).isDirectory())
  .map(s => ({
    dir: s,
    name: path.relative(srcDir, s),
    packageJson: loadPackageJson(path.resolve(s, "package.json"))
  }))
  .filter(o => !!o.packageJson)
  .forEach(o => {
    // Write package.json to out dir
    const outFile = path.resolve(buildDir, o.name, "package.json")
    mkdirSync(path.dirname(outFile), {recursive: true})
    writeFileSync(outFile, JSON.stringify(o.packageJson), {encoding: "utf-8"})
  })
