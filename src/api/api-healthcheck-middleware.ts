import type { IApiMiddleware } from "@service-core/api/handlers"
import { Router } from "express"
import { StatusCodes } from "http-status-codes"

export default class ApiHealthcheckMiddleware implements IApiMiddleware{
  createMiddleware(){
    const router = Router()
    router.get("/healthcheck", (req, res, next) => {
      res.status(StatusCodes.OK)
      res.json({
        healthy:   true,
        timestamp: new Date().toISOString(),
      })
    })
    return router
  }
}

