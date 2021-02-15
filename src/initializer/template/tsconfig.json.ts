// eslint-disable-next-line filenames/match-exported
import type { IInitProjectConfig } from "@kindred-bff-core/initializer/init-project"

export default function template({ name }: IInitProjectConfig){
  // language=tsconfig
  return`
{
  "extends": "@service-core/typescript/tsconfig.json",
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
