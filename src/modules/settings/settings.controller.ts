import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { SettingsService } from "./settings.service";

@Controller("settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Patch()
  @LogAction("تعديل إعدادات المدرسة")
  update(@Body() body: any) {
    return this.settingsService.update(body);
  }
}
