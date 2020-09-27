import { packageName } from "@service-core/config"
import type { IInitProjectConfig } from "@service-core/initializer/init-project"

export default function template({ name }: IInitProjectConfig){
  // language=tsconfig
  return`
{
  "extends": "${ packageName }/typescript/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "outDir": "build",
    "paths": {
      "${ name }/*": [
        "src/*"
      ]
    }
  },
  "include": [
    "src",
    "src/global.d.ts"
  ],
  "exclude": [
    "node_modules",
    "build",
    "dist"
  ]
}
`
}
