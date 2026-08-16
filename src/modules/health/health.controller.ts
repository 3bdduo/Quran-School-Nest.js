import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { Response } from "express";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { Public } from "../../common/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  check(@Res() res: Response) {
    const dbOk = this.connection.readyState === 1;
    res.status(dbOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: dbOk ? "ok" : "degraded",
      database: dbOk ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
}
