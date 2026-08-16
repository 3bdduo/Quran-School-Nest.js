import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { MemorizationService } from "./memorization.service";

@Controller("memorization")
@UseGuards(JwtAuthGuard)
export class MemorizationController {
  constructor(private readonly service: MemorizationService) {}

  @Get(":studentId")
  findByStudent(@CurrentUser() user: CurrentUserPayload, @Param("studentId") studentId: string) {
    return this.service.findByStudent(user, studentId);
  }

  @Post(":studentId")
  @LogAction("تسجيل تسميع/حفظ جديد")
  create(@CurrentUser() user: CurrentUserPayload, @Param("studentId") studentId: string, @Body() body: any) {
    return this.service.create(user, studentId, body);
  }

  @Put(":studentId/:entryId")
  @LogAction("تعديل سجل حفظ")
  update(@CurrentUser() user: CurrentUserPayload, @Param("studentId") studentId: string, @Param("entryId") entryId: string, @Body() body: any) {
    return this.service.update(user, studentId, entryId, body);
  }

  @Delete(":studentId/:entryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف سجل حفظ")
  async remove(@CurrentUser() user: CurrentUserPayload, @Param("studentId") studentId: string, @Param("entryId") entryId: string) {
    await this.service.remove(user, studentId, entryId);
  }
}
