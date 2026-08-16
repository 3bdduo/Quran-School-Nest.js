import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { ExamsService } from "./exams.service";

@Controller("exams")
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly service: ExamsService) {}

  @Get(":eduGroupId")
  findByEduGroup(@CurrentUser() user: CurrentUserPayload, @Param("eduGroupId") eduGroupId: string) {
    return this.service.findByEduGroup(user, eduGroupId);
  }

  @Post(":eduGroupId")
  @LogAction("رصد امتحان جديد")
  create(@CurrentUser() user: CurrentUserPayload, @Param("eduGroupId") eduGroupId: string, @Body() body: any) {
    return this.service.create(user, eduGroupId, body);
  }

  @Put(":eduGroupId/:examId")
  @LogAction("تعديل امتحان")
  update(@CurrentUser() user: CurrentUserPayload, @Param("eduGroupId") eduGroupId: string, @Param("examId") examId: string, @Body() body: any) {
    return this.service.update(user, eduGroupId, examId, body);
  }

  @Delete(":eduGroupId/:examId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف امتحان")
  async remove(@CurrentUser() user: CurrentUserPayload, @Param("eduGroupId") eduGroupId: string, @Param("examId") examId: string) {
    await this.service.remove(user, eduGroupId, examId);
  }
}
