# Service Core
- [Overview](#overview)
- [Getting started](#getting-started)
  - [Requirements](#getting-started-requirements)
  - [Installation and setup.](#getting-started-installation-and-setup)
  - [Nexux configuration](#getting-started-nexus-configuration)
  - [Publishing packages to Nexus](#getting-started-publishing-packages-to-nexus)
  - [Scripts](#getting-started-scripts)
  - [Committing Code](#getting-started-committing-code)
  - [Building Release Version](#getting-started-building-release-version)
- [IDE's](#ides)
  - [VSCODE Settings](#ides-vscode-settings)
- [Documentation](#documentation)
  - [Currently Supported](#documentation-currently-supported)
  - [Roadmap (Future release)](#documentation-roadmap-future-release)
- [Initialising a project](#initialising-a-project)
- [Domain models](#domain-models)
  - [Naming conventions](#domain-models-naming-conventions)
  - [What exactly does this mean ?](#domain-models-what-exactly-does-this-mean-)
  - [What typescript definitions are supported ?](#domain-models-what-typescript-definitions-are-supported-)
  - [How does it work ?](#domain-models-how-does-it-work-)
- [Configuration classes](#configuration-classes)
- [Logging](#logging)
  - [Basic logging](#logging-basic-logging)
  - [Configuring logging](#logging-configuring-logging)
  - [Child loggers](#logging-child-loggers)
  - [Contextual logging](#logging-contextual-logging)
- [System services](#system-services)
  - [Basic example](#system-services-basic-example)
  - [Simple log example](#system-services-simple-log-example)
  - [Transitive dependencies](#system-services-transitive-dependencies)
  - [Startup and Shutdown process](#system-services-startup-and-shutdown-process)
  - [Health check](#system-services-health-check)
- [System registries](#system-registries)
- [Apis](#apis)
  - [Request / Response messages](#apis-request-response-messages)
  - [Api Handler](#apis-api-handler)
  - [Configuration](#apis-configuration)
  - [SDK Generator](#apis-sdk-generator)

[comment]: <> (TOC_END)
  
## Overview <a name="overview"></a>

The Service Core project contains reusable libraries and configurations to help in
the creation of NodeJS Microservices and to keep projects consistent.  
It is designed to take away the plumbing of setting up projects to allow you to focus
on building your features.  
It does this in various ways by enforcing consistent linting, patterns for creating apis,
and working with databases.   
Reusable functionality for communicating with databases, error handling, logging, packaging and deployment.

## Getting started <a name="getting-started"></a>

### Requirements <a name="getting-started-requirements"></a>

- [docker (20.10.6)](https://docs.docker.com/get-docker/)
- [npm (6.14.12), node (v14.16.1)](https://www.npmjs.com/) only required if wanting to run outside of docker

### Installation and setup. <a name="getting-started-installation-and-setup"></a>

**OSX**
First install homebrew [https://brew.sh/](https://brew.sh/).
Install coreutils package.
```bash
brew install coreutils
```

### Nexus configuration <a name="getting-started-nexus-configuration"></a>

Nexus is used for internal npm packages. Use the following steps to configure your local environment.  
When prompted for authentication use your NT credentials.  

```bash
npm config set @service-core:registry https://nexus.apps.dev.aws.optus.com.au/api/npm/service-core/
```

### Scripts <a name="getting-started-scripts"></a>

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

## Documentation <a name="documentation"></a>

### Currently Supported <a name="documentation-currently-supported"></a>

High level list of features includes the following.

- Libraries are broken into their respective packages and released as separate packages
- Eslint configuration for consistent code styling
- Typescript configuration with best practices
- Dependency injection with a runtime system that handles startup and graceful shutdown of database connections,
  loggers, apis
- Configuration classes with environment bound overrides and type checking
- Reusable configurations consisting of groups of services and logic allowing you to import patterns for various functionality
- Automatic Domain Model definition generation through typescript introspection
- Logger designed for containers which supports context based overrides which transparently carries across correlation ids, request
  info etc throughout all logs
- Api integration with message serialization / deserialization from and to typescript classes
- Automatic request / response binding and swagger ui generation
- Api middleware pre configured for cors, security etc
- ESM generated modules for faster execution at runtime
- Jest testing with ESM support
- Initializer project to generate new service projects from scratch

### Roadmap (Future release) <a name="documentation-roadmap-future-release"></a>

High level list of features includes the following.

- Domain model validations
- Automatic injection of dependencies without having to define `static inject` property
- Api SDK generation
- Couchbase libraries with same support for domain model serialization / deserialization
- Couchbase index migrations
- Test helpers to support testing apis, database queries
- Task Queue fault tolerant, distributed for safely managing background processing


## Initialising a project <a name="initialising-a-project"></a>

Basic configuration for starting a bare-bones project is to install the runtime dependencies, setup some scripts and configuration.  
To make this easier you can run the initializer script to generate the skeleton project with the following command.  
**TODO: Still WIP will currently not work!**
```bash
npx "@service-core/initializer/init-project"
```

Once the project is created you will have a base skeleton with minimal configuration.    
To run the project execute the following scripts. The readme in the project will also explain this.   

```bash
# Startup infrastructure
docker compose up -d

# Run typescript compiler
npm run build:watch

# For api project
npm run start:api

# For service project
npm run start:service
```

In the skeleton you will see your `index.ts` file with the runtime system configuration which looks similar to the below.

```typescript
import Logger from "@service-core/logging/logger"
import { System } from "@service-core/runtime/system"
import { IEnvMode, SystemRegistry } from "@service-core/runtime/system-registry"

const envMode: IEnvMode = (process.env.NODE_ENV as IEnvMode) ?? "dev"

const log = new Logger()
const registry = new SystemRegistry()

const system = new System(log, registry, envMode)
await system.startup()
```


## Domain models <a name="domain-models"></a>

Domain models are classes which are defined with properties to represent the data within your domain.  
When defining the domain models a typescript transformer executed through the compiler will introspect the definition and
generate type information so that it can be used at runtime. This allows you to keep the typescript code light and succinct
but benefiting from all of those type constraints at runtime. This concept is used across all aspects of the core such as
configuration, api requests / responses, websocket messages, database models, it is the foundation for all type definitions.

### Naming conventions <a name="domain-models-naming-conventions"></a>

The default configuration for detecting domain models uses the following checks.  
Regexp test for case insensitive file name match `(domain|model|message|event|config)`.  
This would match against any of the following file paths as examples.
```text
src/domain/foo.ts
src/model/foo.ts
src/data/foo-message.ts
something/config.ts
```

### What exactly does this mean ? <a name="domain-models-what-exactly-does-this-mean-"></a>

Let's start with an example of a domain model and a http request.

**Domain Model**

```typescript
class ModelA{
  constructor(
    readonly name: string,
    readonly date: Date,
    readonly count: number,
  ){}
}
```

**Body Request**
```json
{
  "name": "John Smith",
  "date": "2021-07-16T00:00:00Z",
  "count": 12
}
```

In this standard example when deserializing this request it will be turned into an instance of `ModelA` with the all properties defined.  
The request completely matches the domain model so it's straight forward.
```typescript
new ModelA("John Smith", new Date("2021-07-16T00:00:00Z"), 12)
```

Now if we look at other cases where the request does not match it becomes more interesting.

**Body Request**
```json
{
  "name": null,
  "date": "bad",
  "count": "12",
  "extra": "hacking"
}
```
In this case the request would be turned into the following instance of `ModelA`.
```typescript
new ModelA("", new Date(0), 12)
```
You can see that mandatory fields which are null are defaulted, bad dates are defaulted,
number strings are converted into numbers, extra properties are ignored.  
This ensures your domain model will be in the correct structure you expect, reducing the amount
of defensive logic you have to build in order to deserialize domain models.

### What typescript definitions are supported ? <a name="domain-models-what-typescript-definitions-are-supported-"></a>

The most important fact is your root domain model must be a `class`, other than that most typescript definitions will be maintained at runtime.  
Here is a list of typescript features which will be correctly mapped at runtime.
- primitives (string, number, boolean, bigint)
  ```typescript
  class ModelA{
    str: string
    num: number
    bool: boolean
    bigi: bigint
  }
  ```
- integer restricting numbers to ints can be done by using int from type specification
  ```typescript
  import { int } from "@service-core/runtime/type-specification"
  class ModelA{
    count: int
  }
  ```
- optional properties
  ```typescript
  class ModelA{
    name?: string
    count: number | undefined
  }
  ```
- collections (Arrays, Sets, Maps)
  ```typescript
    class ModelA{
      strs: string[]
      nums: Set<number>
      maps: Map<number, string>
    }
  ```
- enums
  ```typescript
    class EnumA{
        One,
        Two,
    }
    class ModelA{
      enum: EnumA
      enums: EnumA[]
    }
  ```
- type literals
  ```typescript
    type IType = "One" | "Two"
    class ModelA{
      type: IType
      types: IType[]
    }
  ```
- unions
  ```typescript
    class ModelB{}
    class ModelC{}
    class ModelA{
      uni: string | number | string[]
      uniclass: ModelB | ModelC
    }
  ```
- dates (by unix timestamp or iso string)
  ```typescript
    class ModelA{
      date: Date
    }
  ```
- buffers (by base64 string)
  ```typescript
    class ModelA{
      buff: Buffer
    }
  ```
- classes and interfaces
  ```typescript
    class ModelB{
        name: string
    } 
    interface IModelC{
      count: number
    }
    class ModelA{
      bee: ModelB
      cee: IModelC
    }
  
    // inherited classes
    class ModelD extends ModelB{
      check: boolean
    }
  
    // Advanced type to reuse properties
    // allowing complex mixin patterns
    interface IBaseA{
      name: string
      count: number
      foo: boolean
    }
    interface IBaseB{
      name: string
      count: number
      foo: boolean
    }
    
    interface Complex extends Pick<IBaseA, "name">, Omit<IBaseB, "name" | "count">, Partial<Pick<IBaseB, "count">>
    class Complex{
        extra: string
    }
    // The above is the equivalent of writing
    class Complex{
        name: string  
        foo: boolean  
        count?: number  
        extra: string
    } 
  ```

### How does it work ? <a name="domain-models-how-does-it-work-"></a>

There is a typescript transformer plugin which is registered with the typescript compiler.  
The transformer will introspect your typescript definitions and generate a static property on the class
with the definition so that it can be used at runtime.  
Take the following definition.
```typescript
enum Status{
  One,
  Two,
}
class ModelA{
  name: string
  count: number
  checked?: boolean
  categories: string[]
  status: Status
}
```
Will be compiled into.
```js
var Status;
(function (Status) {
  Status[Status["One"] = 0] = "One";
  Status[Status["Two"] = 1] = "Two";
})(Status || (Status = {}));

class ModelA{
  static class = {
      name: "Str",
      count: "Float",
      checked: [true, "Bool"],
      categories: ["Arr", "Str"],
      status: ["Enum", Status],
  }
}
```

## Configuration classes <a name="configuration-classes"></a>

Configuration classes are for customising your application between environments. They follow
the same concepts of domain models for defining properties in typescript with one extra static
property to define the namespace of the configuration. It's good practice to default configuration
properties as a base configuration.

Keep configuration properties flat since the configurations are already namespaced it will make
them simpler rather than nesting objects inside the configuration which also makes
overriding them from environment variables hard.

Let's start by creating a new configuration using a database connection as an example.

```typescript
class DataConfig{
    static readonly configNamespace = "Data"
  
    constructor(
      readonly host: string = "localhost",  
      readonly user: string = "admin",  
      readonly pass: string = "",  
    ){}
}
```

To register this configuration in the system do the following.

```typescript
const registry = new SystemRegistry()
    .withConfig(DataConfig)
```

Now you will get strictly typed configuration and autocomplete support which allows for built in environment
overrides and environment variable overrides.

The overriding of properties works in the following way.

```text
Class default values 
 -> Env config "default" 
   -> Env config system was started with eg. "dev" 
     -> Env variables with same key
```

To define an environment configuration do the following.

```typescript
const registry = new SystemRegistry()
    .withConfig(DataConfig)
    //
    // Overrides the class default values
    //
    .withEnvConfig("default", {
        "Data.user": "adm",
    })
    //
    // Overrides when system env is "dev"
    //
    .withEnvConfig("dev", {
        "Data.user": "dev",
    })
    //
    // Overrides when system env is "qa"
    //
    .withEnvConfig("qa", {
        "Data.host": "qa-host",
    })
```

To force override of configuration through environment variables start the node process with the overrides.  
For eg. to override the `DataConfig` configuration for property `pass`.
```bash
Data.pass="your password" node index.js
```
Environment variable names are case insensitive so if you prefer to have all caps that will also work.
```bash
DATA.PASS="your password" node index.js
```

## Logging <a name="logging"></a>

The logger in core is basic in functionality offering all normal logging functionality plus a few bonus features.  
It is designed to work with docker containers by writing json logs to the console that can be picked up by
docker and injested into a logging system.  
Params passed as second argument to log methods will be safely serialized into json, supporting
standard `primitives`, `objects`, `arrays`, `Error`, `Date`,  ES6 types (`Map`, `Set`).

### Basic logging <a name="logging-basic-logging"></a>

```typescript
const log = new Logger()

// Simple message
await log.info("Your message")

// Message with extra params
await log.debug("Your message", { name: "hi", count: 12})

// Error message
try{
    // logic
}catch(e){
  await log.error("Failed to do something", e)
}

```

### Configuring logging <a name="logging-configuring-logging"></a>

To configure by only logging `Error` level severity and above.

```typescript
const log = new Logger({}, undefined, undefined, Severity.Error)
```

To configure with labels to be attached to all logs.

```typescript
const log = new Logger({
  correlationId: "abc"
})

// Produces log { correlationId: "abc", message: "Your message" }
await log.info("Your message") 
```

To configure with redactors to strip PII data from logs.

```typescript
const redactor: ILogRedactor = property => property === "password"
const log = new Logger({}, redactor)

// Produces log { message: "Your message", params: { host: "localhost", password: "<REDACTED>" } }
await log.info("Your message", { host: "localhost", password: "abc" }) 
```

### Child loggers <a name="logging-child-loggers"></a>

You can create child loggers with overriding configuration to replace labels, redactors, severity etc.

```typescript
const log = new Logger({
  correlationId: "abc"
})
const childLog = log.withLabels({ className: "Your class" })

// Produces log { correlationId: "abc", className: "Your class", message: "Your message" }
await childLog.info("Your message") 
```

### Contextual logging <a name="logging-contextual-logging"></a>

Contextual logging will keep labels active throughout all async processing. This avoids unnecessarily passing
down contextual information to child executions making logs more predictable and logic more concise.  
Take the following as an example, we are consuming a message which contains a `correlationId`. We want
all logs during the processing of this message to contain the `correlationId` so they can be queried in logging system. Passing
this `correlationId` down through every function call or passing a logger instance down is messy and error prone.

We want to produce the following logs.

```json
[
  {
    "message": "Message A",
    "correlationId": "abc"
  },
  {
    "message": "Message B",
    "correlationId": "abc"
  }
]
```

## System services <a name="system-services"></a>

System services are classes registered into the system which will be instantiated and lifecycle managed by the system.
They support dependency injection to inject other services keeping them isolated and easily testable.  
They can have an optional startup, shutdown process and healthcheck.   
Logger instance injected into the service will already be configured to report logs with the class name as a label.  
Services by default are singletons, they will only be instantiated once.

The interface definition for a `ISystemService` is defined here [src/runtime/system-registry.ts](src/runtime/system-registry.ts).

### Basic example <a name="system-services-basic-example"></a>

This is a simple example of what a service is. At it's most basic form it is just a standard class.
```typescript
class ServiceA{}
```

To register a service into the system you can do the following.  
By registering a service in the system it will be instantiated when the service starts.
```typescript
const registry = new SystemRegistry()
  .withService(ServiceA)
```

### Simple log example <a name="system-services-simple-log-example"></a>

Let's look at an example of a service which injects a logger to be used when calling a method.  
You can see we have created a constructor which specifies the Logger to be injected.  
Currently you have to also define the static property `inject` with the dependency classes until
next release with a typescript transformer which does this automatically.
```typescript
import Logger from "@service-core/logging/logger"
class ServiceA{
  static readonly inject = [ Logger ]
  
  constructor(private readonly log: Logger){}
  
  async helloWorld(){
      await this.log.info("Hello world")
  }
}
```
Now when you call `helloWorld` method you will see a log message which looks like.
```json
{
  "className": "ServiceA",
  "message": "Hello world"
}
```

### Transitive dependencies <a name="system-services-transitive-dependencies"></a>

It's not required to specify ever single service into the registry if they are going to be injected
by another service. For eg. if you have an api handler that requires a database service you might
want to only register the api handler so if the api handler is removed so is the database service.  
In this example `ServiceA` will still be instantiated through the system because `ApiA` depends on it.

```typescript
// Service
class ServiceA{
  getCount(): number{
  }
}

// Api handler
class ApiA{
  static readonly inject = [ ServiceA ]
  constructor(private readonly service: ServiceA){
  }
  handle(){
      return this.service.getCount()
  }
}

// Register
const registry = new SystemRegistry()
  .withService(ApiA)

```

### Startup and Shutdown process <a name="system-services-startup-and-shutdown-process"></a>

Database connections etc require an initialisation when first starting an application and a shutdown process
to gracefully disconnect clients and finalise writes. The system supports this by defining a `startup` and / or `shutdown` method.  
If the node process is crashing the `shutdown` method will be executed before exiting the process.  
If the system startup process fails due to a service `startup` method throwing an error the entire system will be shutdown gracefully and
process will exit.
```typescript
class Database{
    async startup(){
        // Wait for database to connect
    }
    async shutdown(){
        // Wait for database to disconnect
    }
}
```

### Health check <a name="system-services-health-check"></a>

The docker containers will have their own health check but we also want in process health checks for handling external services being down.  
This is what the `externalHealthcheck` is for, to guarantee our services are healthy in process and act on them when not.

To implement a service health check define an `externalHealthCheck` method which returns `true` / `false` identifying whether the service is healthy.
```typescript
class Database{
    async externalHealthCheck(){
      // Ping database for health check
      return true
    }
}
```

## System registries <a name="system-registries"></a>

System registries bundle several independent services and configs together as a pattern that can be easily
consumed without requiring intimate knowledge of all the moving parts.
A good example of this is a database, let's create some classes and see how we can bundle this up.

```typescript
class SQLConfig{
  static readonly configNamespace = "SQL"

  constructor(
    readonly host: string = "localhost",
    readonly user: string = "admin",
    readonly pass: string = "",
  ){
  }
}

class SQLConnection{
  static readonly inject = [SQLConfig]

  public connection: SQLDriver

  constructor(private readonly config: SQLConfig){
  }

  async startup(){
    this.connection = new SQLDriver(this.config.host, this.config.user, this.config.pass)
  }
}

class SQLRepository{
  static readonly inject = [SQLConnection]

  constructor(private readonly sql: SQLConnection){
  }

  read(id: string){
    return this.sql.connection.read(id)
  }

  write(document: any){
    return this.sql.connection.write(document)
  }
}

const sqlRegistry = new SystemRegistry()
    .withConfig(SQLConfig)
    .withService(SQLConnection)
    .withService(SQLRepository)
```

Now if our application wants to use this database we register the `sqlRegistry` into the registry.  
This gives us strict type configuration for sql config and registers everything inside the `sqlRegistry` into the system.

```typescript
const registry = new SystemRegistry()
    .withRegistry(sqlRegistry)
    .withEnvConfig("dev", {
        "SQL.host": "dbhost"
    })
```

## Apis <a name="apis"></a>

To create rest apis use the following patterns.  
This will create a http server with default middleware installed to work with cors, security, authentication etc.  
A swagger ui will be running on [http://localhost:3000/api/swagger](http://localhost:3000/api/swagger) by default to allow you to test your endpoints.  
Endpoints are automatically created based on the message class name, 
for eg. if your request class is `GetItems` your api endpoint will be [http://localhost:3000/api/v1/GetItems](http://localhost:3000/api/v1/GetItems)

### Request / Response messages <a name="apis-request-response-messages"></a>

Define your request and response messages or import them from package.  
The request class is what defines the supported request query parameters or request body payload.  
The class will be automatically deserialized when receiving the api call.  

```typescript
enum Status{
  Active,
  Closed,
}

class Item{
  constructor(
    readonly name: string,
    readonly status: Status,
  ){}
}

class GetItems{
    constructor(
        readonly size: number,
        readonly status: Status,
    ){}
}

class GetItemsResponse{
    constructor(
        readonly items: readonly Item[],
    ){}
}
```

### Api Handler <a name="apis-api-handler"></a>

Define your api handler, the handler config must exist to be picked up. The config contains
a reference to the `request message` to be deserialised and the `response message` to be serialised. You
can optionally specify other configuration options, see [src/api/handlers.ts](src/api/handlers.ts) for full definition.  
Add your logic within the handle method to create the response. By default requests will use `GET` method unless you modify the 
`method` property on the configuration.  

```typescript
import { ApiConfig, IApiHandler } from "@service-core/api/handlers"

export default class GetItemsHandler implements IApiHandler<GetItems, GetItemsResponse>{
  static readonly api = new ApiConfig( GetItems, GetItemsResponse )
  
  async handle(message: GetItems){
    return new GetItemsResponse(
        [
            new Item("Item A", Status.Active),
            new Item("Item B", Status.Active),
        ]
    )
  }
}
```

### Configuration <a name="apis-configuration"></a>

Register the api registry, define your configurations and register your handlers.

```typescript
import { standardApiRegistry } from "@service-core/api/api-registries"

const registry = new SystemRegistry()
    .withRegistry(standardApiRegistry)
    //
    // Services
    //
    .withService(GetItemsHandler)
    //
    // Configuration
    //
    .withEnvConfig("dev", {
      "Api.port": 3000,
    })
```

### SDK Generator <a name="apis-sdk-generator"></a>

Apis created using the handler registries can have an SDK generated for them. This will create a package that can be imported from ui projects
and will have all the request / response models, can serialize / deserialize between the api endpoints. This will keep the ui in sync with the api 
and reduce duplication between the code bases.  

- **TODO: (Future release)** Implement SDK Generator.

To generate the sdk use the following example as reference. Export the registry that contains all the api handlers. Then call generate command.  
By default this will generate the sdk with the appropriate package naming convention in the build output directory and will automatically be published with 
the rest of the packages when deployed to nexus.

Export your registry as default export.

```typescript
export default new SystemRegistry()
    .withService(GetItemsHandler)
```

Execute generate command.

```bash
npx "@service-core/api/api-sdk-generate" --registry "@your-package/api/registry" 
```

Or optionally specify package name and output directory.  
```bash
npx "@service-core/api/api-sdk-generate" --registry "@your-package/api/registry" --package "@your-package/api-sdk" --outdir "build/.bundles/api-sdk"
```

