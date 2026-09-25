import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { TeachersService } from "./teachers.service";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";

@Controller("teachers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly service: TeachersService) {}

  // للأدمن: قائمة كل المعلمين مع حلقاتهم
  @Get()
  @Roles("admin")
  findAll() {
    return this.service.findAll();
  }

  // للمعلم: بيانات نفسه
  @Get("me")
  @Roles("admin", "teacher")
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.service.findByUsername(user.username);
  }

  // للأدمن: بيانات معلم بعينه
  @Get(":id")
  @Roles("admin")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  // للأدمن: إنشاء معلم جديد (username يُولَّد تلقائياً)
  @Post()
  @Roles("admin")
  @LogAction("إضافة معلم جديد")
  create(@Body() dto: CreateTeacherDto) {
    return this.service.create(dto);
  }

  // للأدمن: تعديل بيانات معلم
  @Put(":id")
  @Roles("admin")
  @LogAction("تعديل بيانات معلم")
  update(@Param("id") id: string, @Body() dto: UpdateTeacherDto) {
    return this.service.update(id, dto);
  }

  // للأدمن: تحديد نوع المعلم بعد إنشائه — "group" (معلم حلقة) أو "other" (معلم عادي، بدون طلاب)
  @Patch(":id/type")
  @Roles("admin")
  @LogAction("تحديد نوع المعلم")
  setType(@Param("id") id: string, @Body("type") type: "group" | "other") {
    return this.service.setType(id, type);
  }

  // للأدمن: حذف معلم
  @Delete(":id")
  @Roles("admin")
  @LogAction("حذف معلم")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  // للأدمن: ربط معلم بحلقة
  @Post(":teacherId/assign/:groupId")
  @Roles("admin")
  @LogAction("ربط معلم بحلقة")
  assign(@Param("teacherId") teacherId: string, @Param("groupId") groupId: string) {
    return this.service.assignToGroup(teacherId, groupId);
  }

  // للأدمن: إلغاء ربط معلم من حلقة
  @Delete(":teacherId/assign/:groupId")
  @Roles("admin")
  @LogAction("إلغاء ربط معلم من حلقة")
  unassign(@Param("teacherId") teacherId: string, @Param("groupId") groupId: string) {
    return this.service.removeFromGroup(teacherId, groupId);
  }
}
