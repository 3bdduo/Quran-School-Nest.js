import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { SalariesService } from "./salaries.service";

@Controller("salaries")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalariesController {
  constructor(private readonly service: SalariesService) {}

  @Get("teachers")
  @Roles("admin")
  allTeachers() {
    return this.service.allTeachers();
  }

  @Get("teacher/:username")
  @Roles("admin")
  oneTeacher(@Param("username") username: string) {
    return this.service.oneTeacher(username);
  }

  @Get("me")
  @Roles("admin", "teacher")
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.service.me(user.username);
  }

  @Put("teacher/:username/config")
  @Roles("admin")
  @LogAction("تعديل إعدادات راتب معلم")
  setConfig(@Param("username") username: string, @Body() body: { baseSalary: number; notes?: string }) {
    return this.service.setConfig(username, body.baseSalary, body.notes);
  }

  @Get("teacher/:username/history")
  @Roles("admin", "teacher")
  history(@Param("username") username: string, @CurrentUser() user: CurrentUserPayload) {
    if (user.role === "teacher" && user.username !== username) {
      throw new ForbiddenException("غير مصرح لك بعرض رواتب معلم آخر");
    }
    return this.service.history(username);
  }

  @Get("month/:monthKey")
  @Roles("admin")
  byMonth(@Param("monthKey") monthKey: string) {
    return this.service.byMonth(monthKey);
  }

  @Put("teacher/:username/month/:monthKey")
  @Roles("admin")
  @LogAction("تسجيل راتب شهري لمعلم")
  setMonth(@Param("username") username: string, @Param("monthKey") monthKey: string, @Body() body: any) {
    return this.service.setMonth(username, monthKey, body);
  }

  @Delete("teacher/:username/month/:monthKey")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف سجل راتب شهري")
  async deleteMonth(@Param("username") username: string, @Param("monthKey") monthKey: string) {
    await this.service.deleteMonth(username, monthKey);
  }
}
