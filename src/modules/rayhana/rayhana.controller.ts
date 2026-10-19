import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { RayhanaService } from "./rayhana.service";
import { RayhanaLevel } from "../../schemas";

@Controller("rayhana")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class RayhanaController {
  constructor(private readonly service: RayhanaService) {}

  // GET /rayhana?year=2026
  @Get()
  getData(@Query("year") year?: string) {
    return this.service.getData(year);
  }

  // GET /rayhana/export?year=2026
  @Get("export")
  @LogAction("تصدير كشف مسابقة ريحانة المدينة إلى إكسل")
  async exportExcel(@Query("year") year: string, @Res() res: Response) {
    const buffer = await this.service.exportExcel(year);
    const targetYear = year ?? new Date().getFullYear().toString();
    const filename = `ريحانة-المدينة-${targetYear}.xlsx`;
    const encoded = encodeURIComponent(filename);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename*=UTF-8''" + encoded,
    );
    res.send(Buffer.from(buffer));
  }

  // POST /rayhana/init  { year: "2026" }
  @Post("init")
  @LogAction("تهيئة طلاب ريحانة المدينة")
  initStudents(@Body("year") year: string) {
    return this.service.initStudents(year ?? new Date().getFullYear().toString());
  }

  // PATCH /rayhana/student/:studentId
  @Patch("student/:studentId")
  @LogAction("تحديث مستوى طالب في ريحانة المدينة")
  updateStudent(
    @Param("studentId") studentId: string,
    @Body() body: { currentLevel?: RayhanaLevel; passed?: boolean; notes?: string; year?: string },
  ) {
    return this.service.updateStudent(studentId, body, body.year);
  }

  // POST /rayhana/bulk-promote  { studentIds: [...], toLevel: "level_5" }
  @Post("bulk-promote")
  @LogAction("ترقية جماعية في ريحانة المدينة")
  bulkPromote(
    @Body("studentIds") studentIds: string[],
    @Body("toLevel") toLevel: RayhanaLevel,
    @Body("year") year?: string,
  ) {
    return this.service.bulkPromote(studentIds, toLevel, year);
  }

  // DELETE /rayhana/student/:studentId
  @Delete("student/:studentId")
  @HttpCode(HttpStatus.OK)
  @LogAction("إزالة طالب من ريحانة المدينة")
  removeStudent(
    @Param("studentId") studentId: string,
    @Query("year") year?: string,
  ) {
    return this.service.removeStudent(studentId, year);
  }
}
