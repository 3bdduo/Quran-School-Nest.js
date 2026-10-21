import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { CompetitionsService } from "./competitions.service";

// ── Controller العام (بدون توكن) — لجلب نتيجة طالب بالرقم القومي ──────────
@Controller("competitions/public")
export class CompetitionsPublicController {
  constructor(private readonly service: CompetitionsService) {}

  @Get("result/:nationalId")
  @HttpCode(HttpStatus.OK)
  getResult(@Param("nationalId") nationalId: string) {
    return this.service.getResultByNationalId(nationalId);
  }
}

// ── Controller المحمي (يحتاج توكن admin/teacher) ──────────────────────────
@Controller("competitions")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompetitionsController {
  constructor(private readonly service: CompetitionsService) {}

  @Get()
  @Roles("admin")
  findAll(@Query("type") type?: "external" | "internal") {
    return this.service.findAll(type);
  }

  @Get(":id")
  @Roles("admin")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles("admin")
  @LogAction("إنشاء مسابقة/اختبار جديد")
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(":id")
  @Roles("admin")
  @LogAction("تعديل بيانات مسابقة")
  update(@Param("id") id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogAction("حذف مسابقة")
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }

  @Post(":id/participants")
  @Roles("admin", "teacher")
  @LogAction("إضافة مشارك لمسابقة")
  addParticipant(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body("studentId") studentId: string,
  ) {
    return this.service.addParticipant(user, id, studentId);
  }

  @Post(":id/participants/bulk")
  @Roles("admin")
  @LogAction("إضافة مشاركين بالجملة لمسابقة")
  bulkAdd(@Param("id") id: string, @Body() body: any) {
    return this.service.bulkAddParticipants(id, body);
  }

  @Delete(":id/participants/:studentId")
  @Roles("admin", "teacher")
  @LogAction("حذف مشارك من مسابقة")
  removeParticipant(
    @Param("id") id: string,
    @Param("studentId") studentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.removeParticipant(user, id, studentId);
  }

  @Put(":id/results")
  @Roles("admin")
  @LogAction("نشر نتائج مسابقة")
  saveResults(@Param("id") id: string, @Body("results") results: any[]) {
    return this.service.saveResults(id, results);
  }
}
