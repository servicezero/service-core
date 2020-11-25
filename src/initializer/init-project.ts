/* eslint-disable no-console */
import {
  Interface,
  createInterface,
} from "readline"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"

export interface IInitProjectConfig {
  readonly displayName: string
  readonly name: string
  readonly outdir: string
  readonly repository: string
}

export interface ITemplateGenerator {
  (config: IInitProjectConfig): Promise<string> | string
}

export type ITemplate = ITemplateGenerator | string

interface IInput<V> {
  readonly msg: string
  readonly required: readonly [V] extends readonly [NonNullable<V>] ? true : false
  fromStr(input: string): V
}

type IInputs<T> = {
  readonly [K in keyof T]: IInput<T[K]>
}

const isTemplateGenerator = (o: any): o is ITemplateGenerator => typeof o === "function"

function inputStr<R extends boolean>(msg: string, required: R){
  return {
    fromStr: (v: string) => v ?? "",
    msg,
    required,
  }
}

const inputConfig: IInputs<IInitProjectConfig> = {
  displayName: inputStr("What is the display name of your project ?", true),
  name:        inputStr("What is the package name of your project ?", true),
  outdir:      inputStr("What is path to project directory ?", true),
  repository:  inputStr("What is the repository url of your project ?", true),
}
const executeQuestion = inputStr("Are you happy with the following configuration (Y/N) ?", true)

async function getInputValue<T>(rl: Interface, input: IInput<T>, currentValue?: T): Promise<T>{
  while(true){
    const result = await new Promise<string>(resolve => {
      rl.question(`${ input.msg } `, answer => resolve((answer ?? "").trim()))
      // display current value
      rl.write((currentValue as any ?? "").toString())
    })
    if(result.trim().length === 0 && input.required){
      console.error("Sorry this field is required")
      continue
    }
    // convert value
    return input.fromStr(result)
  }
}

async function captureConfig(): Promise<IInitProjectConfig>{
  const rl = createInterface({
    input:  process.stdin,
    output: process.stdout,
  })

  const config: Mutable<IInitProjectConfig> = {
    displayName: "",
    name:        "",
    outdir:      "build/.outdir",
    repository:  "",
  }

  const capture = async() => {
    console.clear()
    for(const [ key, input ] of Object.entries(inputConfig) as readonly (readonly [keyof IInitProjectConfig, IInput<any>])[]){
      config[key] = await getInputValue(rl, input, config[key])
    }
    // Report review of configuration
    console.table(config)
    const shouldExec = await getInputValue(rl, executeQuestion, "Y")
    return shouldExec.toUpperCase() === "Y"
  }
  while(!(await capture())){
    // Continue waiting until user accepts config
  }
  // Close console capture
  rl.close()

  return config
}

async function getAllTemplateFiles(rootdir: string): Promise<readonly string[]>{
  const allFiles: string[] = []

  const recursive = async(file: string) => {
    const stats = await fs.stat(file)
    if(stats.isDirectory()){
      const files = await fs.readdir(file)
      await Promise.all(files.map(f => recursive(path.resolve(file, f))))
    } else if(stats.isFile() && file.endsWith(".js")){
      allFiles.push(file)
    }
  }
  await recursive(rootdir)

  return allFiles
}

async function readTemplate(config: IInitProjectConfig, filePath: string, outfile: string){
  const template: ITemplate = (await import(filePath)).default
  // generate file data
  const data = isTemplateGenerator(template) ? await template(config) : template
  // write file to disk
  console.log(`Writing Template File: '${ outfile }'`)
  await fs.mkdir(path.dirname(outfile), { recursive: true })
  await fs.writeFile(outfile, data.trim(), { encoding: "utf-8" })
}

async function execProgram(currentDir: string, errMsg: string, cmd: string, ...cmdArgs: readonly string[]){
  return new Promise<number>((resolve, reject) => {
    const childProcess = spawn(cmd, cmdArgs, { cwd: currentDir, stdio: [ process.stdin, process.stdout, process.stderr ] })
    childProcess.once("exit", code => {
      if (code === 0){
        resolve(code)
      } else {
        reject(new Error(`${ errMsg }, exited with code: ${ code }`))
      }
    })
    childProcess.once("error", reject)
  })
}

async function initProject(){
  // Capture configuration from user terminal input
  const config = await captureConfig()
  console.log("Generating project...")
  // create out directory
  const outdir = path.resolve(config.outdir)
  await fs.mkdir(outdir, { recursive: true })
  // locate all templates
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const templateDir = path.resolve(dir, "template")
  const files = await getAllTemplateFiles(templateDir)
  // read all template files and generate code
  await Promise.all(files.map(f => readTemplate(config, f, path.resolve(outdir, path.relative(templateDir, f).replace(/\.js$/i, "")))))
  // Install dependencies
  console.log("Installing npm packages...")
  await execProgram(outdir, "Failed to install npm packages", "npm", "install")
  console.log("Installed npm packages")
  // Setup git
  console.log("Initialising git...")
  await execProgram(outdir, "Failed to initialise git", "git", "init")
  await execProgram(outdir, "Failed to add all files to git", "git", "add", "--all")
  await execProgram(outdir, "Failed to add all files to git", "git", "commit", "-m", "config: initialise project")
  console.log("Initialised git")
  // Exit
  console.log(`Generated project in directory: '${ outdir }'`)
}

await initProject()
