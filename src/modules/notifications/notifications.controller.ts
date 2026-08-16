import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles("admin")
  findAllForAdmin() {
    return this.notificationsService.findAllForAdmin();
  }

  @Get("me")
  findMine(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.findMine(user);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.unreadCount(user);
  }

  @Post()
  @Roles("admin")
  @LogAction("إرسال إشعار جديد")
  create(@Body() body: { title: string; body: string; target: string }) {
    return this.notificationsService.create(body.title, body.body, body.target);
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markRead(id, user.username);
  }

  @Delete(":id")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف إشعار")
  async remove(@Param("id") id: string) {
    await this.notificationsService.remove(id);
  }
}
