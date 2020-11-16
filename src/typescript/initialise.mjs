import fs from "fs"
import path from "path"

// copy package.json so
// transformers use commonjs
// limitation of ttsc
fs.writeFileSync(path.resolve("build/.transformers/package.json"), JSON.stringify({
  "type": "commonjs"
}))
