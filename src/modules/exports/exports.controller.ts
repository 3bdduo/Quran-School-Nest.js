import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { ExportsService } from "./exports.service";

// ============================================================================
// كل مسارات التصدير دي مخصوصة للأدمن الكبير بس، وبتطلع ملفات Word / Excel
// جاهزة للطباعة بتنسيق احترافي (هيدر باسم المدرسة، ألوان، جداول، تاريخ التصدير).
// ============================================================================
@Controller("exports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Get("students.xlsx")
  @LogAction("تصدير كشف الطلاب إلى إكسل")
  async studentsExcel(@Res() res: Response) {
    const buffer = await this.service.studentsExcel();
    this.sendXlsx(res, buffer, "كشف-الطلاب.xlsx");
  }

  @Get("students/:id.docx")
  @LogAction("تصدير تقرير طالب إلى وورد")
  async studentProfileWord(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.service.studentProfileWord(id);
    this.sendDocx(res, buffer, `تقرير-طالب-${id}.docx`);
  }

  @Get("payments/:monthKey.xlsx")
  @LogAction("تصدير تقرير المدفوعات إلى إكسل")
  async paymentsExcel(@Param("monthKey") monthKey: string, @Res() res: Response) {
    const buffer = await this.service.paymentsExcel(monthKey);
    this.sendXlsx(res, buffer, `تقرير-المدفوعات-${monthKey}.xlsx`);
  }

  @Get("attendance/:groupId.xlsx")
  @LogAction("تصدير كشف حضور إلى إكسل")
  async attendanceExcel(@Param("groupId") groupId: string, @Query("date") date: string, @Res() res: Response) {
    const buffer = await this.service.attendanceExcel(groupId, date);
    this.sendXlsx(res, buffer, `كشف-حضور-${date}.xlsx`);
  }

  @Get("salaries/:monthKey.xlsx")
  @LogAction("تصدير تقرير الرواتب إلى إكسل")
  async salariesExcel(@Param("monthKey") monthKey: string, @Res() res: Response) {
    const buffer = await this.service.salariesExcel(monthKey);
    this.sendXlsx(res, buffer, `تقرير-الرواتب-${monthKey}.xlsx`);
  }

  @Get("competitions/:id.docx")
  @LogAction("تصدير نتائج مسابقة إلى وورد")
  async competitionResultsWord(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.service.competitionResultsWord(id);
    this.sendDocx(res, buffer, `نتائج-مسابقة-${id}.docx`);
  }

  @Get("dashboard.docx")
  @LogAction("تصدير التقرير العام إلى وورد")
  async dashboardWord(@Query("monthKey") monthKey: string, @Res() res: Response) {
    const buffer = await this.service.dashboardWord(monthKey);
    this.sendDocx(res, buffer, "التقرير-العام.docx");
  }

  private sendXlsx(res: Response, buffer: any, filename: string) {
    const encoded = encodeURIComponent(filename);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encoded);
    res.send(Buffer.from(buffer));
  }

  private sendDocx(res: Response, buffer: Buffer, filename: string) {
    const encoded = encodeURIComponent(filename);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encoded);
    res.send(buffer);
  }
}
