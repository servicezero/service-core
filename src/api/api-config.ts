export class ApiServerConfig{
  static readonly envConfigPrefix = "Api"

  /**
   * @param apiUrlPrefix Optionally specify the api url prefix. Defaults to "/api/v1"
   * @param port The port to run api server
   * @param swaggerUrlPrefix Optionally specify the swagger url prefix. Defaults to "/api/swagger"
   */
  constructor(
    readonly apiUrlPrefix: string = "/api/v1",
    readonly port: number = 3000,
    readonly swaggerUrlPrefix: string = "/api/swagger",
  ){
  }
}
