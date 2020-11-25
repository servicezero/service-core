import fs from "fs"
import path from "path"

// copy package.json so
// transformers use commonjs
// limitation of ttsc
fs.mkdirSync(path.resolve("build/typescript"), {recursive: true})
fs.writeFileSync(path.resolve("build/typescript/package.json"), JSON.stringify({
  "type": "commonjs"
}))
