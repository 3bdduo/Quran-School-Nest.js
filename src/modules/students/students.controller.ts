import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { StudentsService } from "./students.service";

@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "teacher")
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload, @Query("groupId") groupId?: string) {
    return this.studentsService.findAll(user, groupId);
  }

  // مسار عام (بدون توكن) عشان صفحة تسجيل دخول الطالب تتأكد من الرقم القومي
  @Public()
  @Get("by-national-id/:nationalId")
  findByNationalId(@Param("nationalId") nationalId: string) {
    return this.studentsService.findByNationalId(nationalId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.studentsService.findOne(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "teacher")
  @Post()
  @LogAction("تسجيل طالب جديد")
  create(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.studentsService.create(user, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "teacher")
  @Put(":id")
  @LogAction("تعديل بيانات طالب")
  update(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.studentsService.update(id, user, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف طالب")
  async remove(@Param("id") id: string) {
    await this.studentsService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch(":id/monthly-fee")
  @LogAction("تعديل الاشتراك الشهري لطالب")
  updateMonthlyFee(@Param("id") id: string, @Body("fee") fee: number) {
    return this.studentsService.updateMonthlyFee(id, fee);
  }
}
