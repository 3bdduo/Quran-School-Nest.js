import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get("student/:studentId")
  byStudent(@CurrentUser() user: CurrentUserPayload, @Param("studentId") studentId: string) {
    return this.service.byStudent(user, studentId);
  }

  @Patch("student/:studentId/month/:monthKey")
  @Roles("admin")
  @LogAction("تحديث حالة دفع اشتراك شهري")
  updateMonth(@Param("studentId") studentId: string, @Param("monthKey") monthKey: string, @Body() body: any) {
    return this.service.updateMonth(studentId, monthKey, body);
  }

  @Get("summary/:monthKey")
  @Roles("admin")
  summary(@Param("monthKey") monthKey: string) {
    return this.service.summary(monthKey);
  }

  @Get("group/:groupId/:monthKey")
  byGroup(@CurrentUser() user: CurrentUserPayload, @Param("groupId") groupId: string, @Param("monthKey") monthKey: string) {
    return this.service.byGroup(user, groupId, monthKey);
  }
}
