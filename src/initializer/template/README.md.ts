import type { IInitProjectConfig } from "@service-core/initializer/init-project"

export default function template({ displayName }: IInitProjectConfig){
  // language=markdown
  return`
# ${ displayName }
This is generated from service core library.

## Getting Started

### Requirements

- [docker (20.10.6)](https://docs.docker.com/get-docker/)
- [npm (6.14.12), node (v14.16.1)](https://www.npmjs.com/) only required if wanting to run outside of docker

### Installation and setup.

**OSX**
First install homebrew [https://brew.sh/](https://brew.sh/).
Install coreutils package.

\`\`\`bash
brew install coreutils
\`\`\`

### Scripts

Install dependencies.

\`\`\`bash
npm ci
\`\`\`

To run the typescript compiler, run:

\`\`\`bash
npm start
\`\`\`

To run the unit tests once, run:

\`\`\`bash
npm run test
\`\`\`

To run the unit tests and watch for file changes during development, run:

\`\`\`bash
npm run test: watch
\`\`\`

To check and fix the linting of your code there are the following commands (it's a good idea to do this before attempting your commit)

\`\`\`bash
npm run lint: fix
\`\`\`

### Committing Code

This repo enforces [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).
Once you have checked, tested and linted your code you may create a commit.

## IDE's

### VSCODE Settings

\`\`\`
{
"editor.formatOnSave": false,
"eslint.alwaysShowStatus": true,
"editor.trimAutoWhitespace": true,
"files.trimTrailingWhitespace": true,
"editor.codeActionsOnSave": {
"source.organizeImports": false,
"source.fixAll.eslint": true,
"source.fixAll": true
}
}
\`\`\`
`
}


