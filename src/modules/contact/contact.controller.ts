import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { ContactService } from "./contact.service";

@Controller("contact")
export class ContactController {
  constructor(private readonly service: ContactService) {}

  // عام — نموذج "تواصل معنا"، بمعدل محدود لمنع السبام
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post()
  submit(@Body() body: any) {
    return this.service.submit(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get()
  findAll(@Query("status") status?: string) {
    return this.service.findAll(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch(":id/read")
  @LogAction("تعليم رسالة تواصل كمقروءة")
  markRead(@Param("id") id: string) {
    return this.service.markRead(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف رسالة تواصل")
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }
}
