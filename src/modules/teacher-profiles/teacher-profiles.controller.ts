import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { TeacherProfilesService } from "./teacher-profiles.service";

@Controller("teacher-profiles")
export class TeacherProfilesController {
  constructor(private readonly service: TeacherProfilesService) {}

  @Public()
  @Get()
  findPublished() {
    return this.service.findPublished();
  }

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get("admin/all")
  findAllForAdmin() {
    return this.service.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Post()
  @LogAction("إضافة بروفايل معلم عام")
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Put(":id")
  @LogAction("تعديل بروفايل معلم عام")
  update(@Param("id") id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف بروفايل معلم عام")
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }
}
