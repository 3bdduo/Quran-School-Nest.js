import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { GroupsService } from "./groups.service";

@Controller("groups")
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @Roles("admin")
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.findOne(id, user);
  }

  @Post()
  @Roles("admin")
  @LogAction("إنشاء حلقة تحفيظ جديدة")
  create(@Body() body: any) {
    return this.groupsService.create(body);
  }

  @Put(":id")
  @Roles("admin", "teacher")
  @LogAction("تعديل بيانات حلقة")
  update(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.groupsService.update(id, user, body);
  }

  @Delete(":id")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف حلقة تحفيظ")
  async remove(@Param("id") id: string) {
    await this.groupsService.remove(id);
  }
}
