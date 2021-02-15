// eslint-disable-next-line filenames/match-exported
import {
  packageName,
  packageVersion,
} from "@service-core/config"
import type { IInitProjectConfig } from "@service-core/initializer/init-project"

export default function template({ name, repository }: IInitProjectConfig){
  // language=json
  return`
{
  "name": "${ name }",
  "private": true,
  "version": "0.0.1",
  "description": "",
  "type": "module",
  "engines": {
    "node": ">=14.16.1",
    "npm": ">=6.14.12"
  },
  "repository": {
    "type": "git",
    "url": "git+${ repository }"
  },
  "author": "",
  "license": "UNLICENSED",
  "devDependencies": {},
  "//dependencies": {
    "@service-core/logging": "${ packageVersion }"
  },
  "dependencies": {
    "typescript": "^4.0.2"
  },
  "eslintConfig": {
    "extends": [
      "@service-core/eslint-config/recommended.js"
    ],
    "parserOptions": {
      "project": "tsconfig.json"
    }
  },
  "jest": {
    "resetMocks": true,
    "timers": "fake",
    "moduleNameMapper": {
      "${ name }/(.*)": "<rootDir>/build/$1"
    },
    "setupFiles": [
      "<rootDir>/build/testing/jest-setup.js"
    ],
    "transform": {},
    "testMatch": [
      "<rootDir>/build/**/*.(spec|int).js"
    ],
    "moduleFileExtensions": [
      "js",
      "cjs",
      "mjs",
      "json"
    ],
    "coverageDirectory": "<rootDir>/build/.coverage",
    "reporters": [
      "default",
      [
        "jest-junit",
        {
          "outputDirectory": "./build/.report",
          "outputName": "junit-report.xml"
        }
      ]
    ]
  },
  "modulePaths": {
    "${ name }": [
      "./build"
    ]
  },
  "scripts": {
    "lint": "eslint --quiet --ext .ts,.js src/",
    "lint:fix": "eslint --fix --quiet --ext .ts,.js src/",
    "test": "NODE_ENV=testing node --no-warnings --experimental-specifier-resolution=node --experimental-vm-modules --enable-source-maps node_modules/.bin/jest --collectCoverage",
    "test:watch": "NODE_ENV=testing node --no-warnings --experimental-specifier-resolution=node --experimental-vm-modules --enable-source-maps node_modules/.bin/jest --watchAll",
    "start": "ttsc -p tsconfig.json -w",
    "build": "ttsc -p tsconfig.json"
  }
}
`
}
