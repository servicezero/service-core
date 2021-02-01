# Service Core
These are core libraries for creating nodejs micro services.

## Getting Started

### Requirements

- [docker (20.10.6)](https://docs.docker.com/get-docker/)
- [npm (6.14.12), node (v14.16.1)](https://www.npmjs.com/) only required if wanting to run outside of docker

### Installation and setup.

**OSX**
First install homebrew [https://brew.sh/](https://brew.sh/).
Install coreutils package.
```bash
brew install coreutils
### Publishing packages to Nexus

To publish packages run the following commands.

```bash
export CI_VERSION="{Sem Ver}"
npm run build:cjs:release
npm run build:esm:release
npm run bundle:packages

```

### Scripts

Install dependencies.

```bash
npm ci
```

To run the typescript compiler, run:

```bash
npm start
```

To run the unit tests once, run:

```bash
npm run test
```

To run the unit tests and watch for file changes during development, run:

```bash
npm run test:watch
```

To check and fix the linting of your code there are the following commands (it's a good idea to do this before attempting your commit)

```bash
npm run lint:fix
```

### Committing Code

This repo enforces [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).
Once you have checked, tested and linted your code you may create a commit.

### Building Release Version

The repo uses a CI pipeline to build, test and deploy code.
To create a feature deployment create a feature branch using the convention `/feature/{FEATURE_NAME}`.
This will run the pipeline and deploy your feature. Once you are ready for your feature to be merged raise
a `Merge Request`, once approved and merged into master the feature will be released into nexus.

## IDE's

### VSCODE Settings

```
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
```
