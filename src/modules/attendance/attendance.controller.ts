import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { AttendanceService } from "./attendance.service";

@Controller("attendance")
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @LogAction("تسجيل حضور طالب")
  markOne(@CurrentUser() user: CurrentUserPayload, @Body() body: { studentId: string; date: string; status: string }) {
    return this.attendanceService.markOne(user, body.studentId, body.date, body.status);
  }

  @Post("bulk")
  @LogAction("تسجيل حضور جماعي")
  markBulk(@CurrentUser() user: CurrentUserPayload, @Body() body: { date: string; entries: any[] }) {
    return this.attendanceService.markBulk(user, body.date, body.entries);
  }

  @Get("student/:studentId")
  byStudent(@CurrentUser() user: CurrentUserPayload, @Param("studentId") studentId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.attendanceService.byStudent(user, studentId, from, to);
  }

  @Get("group/:groupId")
  byGroup(@CurrentUser() user: CurrentUserPayload, @Param("groupId") groupId: string, @Query("date") date: string) {
    return this.attendanceService.byGroup(user, groupId, date);
  }

  @Get("rate/:studentId")
  rate(@CurrentUser() user: CurrentUserPayload, @Param("studentId") studentId: string) {
    return this.attendanceService.rate(user, studentId);
  }
}
