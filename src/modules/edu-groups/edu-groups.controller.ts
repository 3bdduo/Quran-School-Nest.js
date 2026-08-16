import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { EduGroupsService } from "./edu-groups.service";

@Controller("edu-groups")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EduGroupsController {
  constructor(private readonly eduGroupsService: EduGroupsService) {}

  @Get()
  @Roles("admin")
  findAll() {
    return this.eduGroupsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.eduGroupsService.findOne(id, user);
  }

  @Post()
  @Roles("admin")
  @LogAction("إنشاء مجموعة تعليمية جديدة")
  create(@Body() body: any) {
    return this.eduGroupsService.create(body);
  }

  @Put(":id")
  @Roles("admin", "teacher")
  @LogAction("تعديل بيانات مجموعة تعليمية")
  update(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.eduGroupsService.update(id, user, body);
  }

  @Delete(":id")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف مجموعة تعليمية")
  async remove(@Param("id") id: string) {
    await this.eduGroupsService.remove(id);
  }

  @Post(":id/students")
  @Roles("admin", "teacher")
  @LogAction("إضافة طالب لمجموعة تعليمية")
  addStudent(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload, @Body("studentId") studentId: string) {
    return this.eduGroupsService.addStudent(id, user, studentId);
  }

  @Delete(":id/students/:studentId")
  @Roles("admin", "teacher")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف طالب من مجموعة تعليمية")
  async removeStudent(@Param("id") id: string, @Param("studentId") studentId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.eduGroupsService.removeStudent(id, user, studentId);
  }
}
