import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get("dashboard")
  @Roles("admin")
  dashboard(@Query("monthKey") monthKey?: string) {
    return this.service.dashboard(monthKey);
  }

  @Get("student/:studentId")
  studentReport(@CurrentUser() user: CurrentUserPayload, @Param("studentId") studentId: string) {
    return this.service.studentReport(user, studentId);
  }
}
