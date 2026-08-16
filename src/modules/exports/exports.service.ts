import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as ExcelJS from "exceljs";
import { Packer } from "docx";
import {
  Settings, Student, Group, EduGroup, PaymentRecord, AttendanceRecord, MemorizationLog,
  TeacherSalaryConfig, TeacherSalaryRecord, Competition, CompetitionResult,
} from "../../schemas";
import { addReportHeader, styleDataRow, styleTableHeaderRow, styleWorksheet } from "./excel.util";
import { buildDocument, buildTable, buildTitlePage, sectionHeading } from "./word.util";
import { Paragraph } from "docx";

@Injectable()
export class ExportsService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(EduGroup.name) private readonly eduGroupModel: Model<EduGroup>,
    @InjectModel(PaymentRecord.name) private readonly paymentModel: Model<PaymentRecord>,
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecord>,
    @InjectModel(MemorizationLog.name) private readonly memorizationModel: Model<MemorizationLog>,
    @InjectModel(TeacherSalaryConfig.name) private readonly salaryConfigModel: Model<TeacherSalaryConfig>,
    @InjectModel(TeacherSalaryRecord.name) private readonly salaryRecordModel: Model<TeacherSalaryRecord>,
    @InjectModel(Competition.name) private readonly competitionModel: Model<Competition>,
    @InjectModel(CompetitionResult.name) private readonly competitionResultModel: Model<CompetitionResult>,
  ) {}

  private async schoolName() {
    const s = await this.settingsModel.findById(1).lean();
    return s?.school_name || "مدرسة التربية بالقرءان الكريم";
  }

  // ==========================================================================
  // 1) إكسل: كشف بجميع الطلاب (بالحلقة، السن، الحفظ، الاشتراك الشهري)
  // ==========================================================================
  async studentsExcel(): Promise<ExcelJS.Buffer> {
    const [schoolName, students, groups] = await Promise.all([
      this.schoolName(),
      this.studentModel.find().sort({ name: 1 }).lean(),
      this.groupModel.find().lean(),
    ]);
    const groupNameMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("الطلاب");
    styleWorksheet(sheet);
    const headers = ["م", "الاسم", "الرقم القومي", "الحلقة", "السن", "الهاتف", "المحفوظ", "الاشتراك الشهري"];
    sheet.columns = headers.map(() => ({ width: 18 }));
    addReportHeader(sheet, schoolName, "كشف بيانات الطلاب", headers.length);

    const headerRow = sheet.addRow(headers);
    styleTableHeaderRow(headerRow);

    students.forEach((s, idx) => {
      const row = sheet.addRow([
        idx + 1, s.name, s.national_id, groupNameMap[s.group_id] || "-", s.age, s.phone || "-",
        s.memorized_amount, s.monthly_fee,
      ]);
      styleDataRow(row, idx % 2 === 0);
    });

    return workbook.xlsx.writeBuffer();
  }

  // ==========================================================================
  // 2) وورد: بروفايل تفصيلي لطالب واحد (حضور / حفظ / مدفوعات)
  // ==========================================================================
  async studentProfileWord(studentId: string): Promise<Buffer> {
    const schoolName = await this.schoolName();
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");

    const group = await this.groupModel.findOne({ id: student.group_id }).lean();
    const attendance = await this.attendanceModel.find({ student_id: studentId }).sort({ date: -1 }).limit(30).lean();
    const memorization = await this.memorizationModel.find({ student_id: studentId }).sort({ date: -1 }).limit(30).lean();
    const payments = await this.paymentModel.find({ student_id: studentId }).sort({ month_key: -1 }).lean();

    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "حاضر").length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    const infoTable = buildTable(
      ["البيان", "القيمة"],
      [
        ["الاسم", student.name],
        ["الرقم القومي", student.national_id],
        ["الحلقة", group?.name || "-"],
        ["السن", String(student.age)],
        ["الهاتف", student.phone || "-"],
        ["إجمالي المحفوظ", student.memorized_amount],
        ["الاشتراك الشهري", String(student.monthly_fee)],
        ["نسبة الحضور (آخر 30 سجل)", `${attendanceRate}%`],
      ],
    );

    const memorizationTable = buildTable(
      ["التاريخ", "الكمية المضافة", "الإجمالي بعدها", "ملاحظة المعلم"],
      memorization.map((m) => [m.date, m.added_amount, m.total_after, m.teacher_note || "-"]),
    );

    const paymentsTable = buildTable(
      ["الشهر", "الحالة", "المبلغ", "تاريخ الدفع"],
      payments.map((p) => [p.month_key, p.status === "paid" ? "مدفوع" : p.status === "exempt" ? "معفى" : "غير مدفوع", String(p.amount ?? "-"), p.paid_date || "-"]),
    );

    const doc = buildDocument(schoolName, [
      ...buildTitlePage(schoolName, "التقرير الشامل للطالب", student.name),
      sectionHeading("البيانات الأساسية"),
      infoTable,
      sectionHeading("سجل الحفظ (آخر 30 سجل)"),
      memorization.length ? memorizationTable : new Paragraph({ bidirectional: true, text: "لا يوجد سجلات حفظ بعد." }),
      sectionHeading("سجل المدفوعات"),
      payments.length ? paymentsTable : new Paragraph({ bidirectional: true, text: "لا يوجد سجلات مدفوعات بعد." }),
    ]);

    return Packer.toBuffer(doc);
  }

  // ==========================================================================
  // 3) إكسل: تقرير المدفوعات لشهر معين لكل الطلاب
  // ==========================================================================
  async paymentsExcel(monthKey: string): Promise<ExcelJS.Buffer> {
    const schoolName = await this.schoolName();
    const [students, groups, payments] = await Promise.all([
      this.studentModel.find().sort({ name: 1 }).lean(),
      this.groupModel.find().lean(),
      this.paymentModel.find({ month_key: monthKey }).lean(),
    ]);
    const groupNameMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));
    const paymentMap = Object.fromEntries(payments.map((p) => [p.student_id, p]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("المدفوعات");
    styleWorksheet(sheet);
    const headers = ["م", "الاسم", "الحلقة", "الحالة", "المبلغ", "تاريخ الدفع", "ملاحظة"];
    sheet.columns = headers.map(() => ({ width: 20 }));
    addReportHeader(sheet, schoolName, `تقرير المدفوعات — ${monthKey}`, headers.length);

    const headerRow = sheet.addRow(headers);
    styleTableHeaderRow(headerRow);

    const statusAr = (s?: string) => (s === "paid" ? "مدفوع" : s === "exempt" ? "معفى" : "غير مدفوع");

    students.forEach((s, idx) => {
      const p: any = paymentMap[s.id];
      const row = sheet.addRow([
        idx + 1, s.name, groupNameMap[s.group_id] || "-", statusAr(p?.status), p?.amount ?? s.monthly_fee, p?.paid_date || "-", p?.note || "-",
      ]);
      styleDataRow(row, idx % 2 === 0);
      if (p?.status === "paid") row.getCell(4).font = { color: { argb: "FF0F6B3E" }, bold: true };
      else if (!p || p.status === "unpaid") row.getCell(4).font = { color: { argb: "FFB00020" }, bold: true };
    });

    const paidCount = payments.filter((p) => p.status === "paid").length;
    const totalAmount = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    sheet.addRow([]);
    const summaryRow = sheet.addRow(["", "", "", "إجمالي المدفوع", paidCount, "الإجمالي (جنيه)", totalAmount]);
    summaryRow.font = { bold: true };

    return workbook.xlsx.writeBuffer();
  }

  // ==========================================================================
  // 4) إكسل: كشف حضور يومي لحلقة معينة
  // ==========================================================================
  async attendanceExcel(groupId: string, date: string): Promise<ExcelJS.Buffer> {
    const schoolName = await this.schoolName();
    const group = await this.groupModel.findOne({ id: groupId }).lean();
    if (!group) throw new NotFoundException("الحلقة غير موجودة");

    const students = await this.studentModel.find({ group_id: groupId }).sort({ name: 1 }).lean();
    const records = await this.attendanceModel.find({ student_id: { $in: students.map((s) => s.id) }, date }).lean();
    const statusMap = Object.fromEntries(records.map((r) => [r.student_id, r.status]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("الحضور");
    styleWorksheet(sheet);
    const headers = ["م", "اسم الطالب", "الحالة"];
    sheet.columns = [{ width: 8 }, { width: 30 }, { width: 18 }];
    addReportHeader(sheet, schoolName, `كشف حضور — ${group.name} — ${date}`, headers.length);

    const headerRow = sheet.addRow(headers);
    styleTableHeaderRow(headerRow);

    students.forEach((s, idx) => {
      const status = statusMap[s.id] || "غائب";
      const row = sheet.addRow([idx + 1, s.name, status]);
      styleDataRow(row, idx % 2 === 0);
      const color = status === "حاضر" ? "FF0F6B3E" : status === "متأخر" ? "FFB8860B" : "FFB00020";
      row.getCell(3).font = { bold: true, color: { argb: color } };
    });

    return workbook.xlsx.writeBuffer();
  }

  // ==========================================================================
  // 5) إكسل: رواتب المعلمين لشهر معين (بديل احترافي لتصدير الـ CSV القديم)
  // ==========================================================================
  async salariesExcel(monthKey: string): Promise<ExcelJS.Buffer> {
    const schoolName = await this.schoolName();
    const configs = await this.salaryConfigModel.find().lean();
    const records = await this.salaryRecordModel.find({ month_key: monthKey }).lean();
    const recordMap = Object.fromEntries(records.map((r) => [r.teacher_username, r]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("الرواتب");
    styleWorksheet(sheet);
    const headers = ["م", "المعلم", "الراتب الأساسي", "الحالة", "المبلغ المدفوع", "تاريخ الدفع", "ملاحظة"];
    sheet.columns = headers.map(() => ({ width: 20 }));
    addReportHeader(sheet, schoolName, `تقرير رواتب المعلمين — ${monthKey}`, headers.length);

    const headerRow = sheet.addRow(headers);
    styleTableHeaderRow(headerRow);

    const statusAr = (s?: string) => (s === "paid" ? "مدفوع" : s === "advance" ? "سلفة" : "غير مدفوع");

    configs.forEach((c, idx) => {
      const rec: any = recordMap[c.teacher_username];
      const row = sheet.addRow([idx + 1, c.teacher_username, c.base_salary, statusAr(rec?.status), rec?.amount ?? 0, rec?.paid_date || "-", rec?.note || "-"]);
      styleDataRow(row, idx % 2 === 0);
      if (rec?.status === "paid") row.getCell(4).font = { color: { argb: "FF0F6B3E" }, bold: true };
      else if (!rec || rec.status === "unpaid") row.getCell(4).font = { color: { argb: "FFB00020" }, bold: true };
    });

    return workbook.xlsx.writeBuffer();
  }

  // ==========================================================================
  // 6) وورد: تقرير نتائج مسابقة (شكل إعلان نتائج احترافي)
  // ==========================================================================
  async competitionResultsWord(competitionId: string): Promise<Buffer> {
    const schoolName = await this.schoolName();
    const comp = await this.competitionModel.findOne({ id: competitionId }).lean();
    if (!comp) throw new NotFoundException("المسابقة غير موجودة");

    const results = await this.competitionResultModel.find({ competition_id: competitionId }).sort({ rank_position: 1 }).lean();
    const studentIds = results.map((r) => r.student_id);
    const students = await this.studentModel.find({ id: { $in: studentIds } }).lean();
    const nameMap = Object.fromEntries(students.map((s) => [s.id, s.name]));

    const resultsTable = buildTable(
      ["الترتيب", "اسم الطالب", "الدرجة", "ملاحظات"],
      results.map((r) => [String(r.rank_position), nameMap[r.student_id] || r.student_id, String(r.score), r.notes || "-"]),
    );

    const doc = buildDocument(schoolName, [
      ...buildTitlePage(schoolName, `نتائج مسابقة: ${comp.name}`, `عام ${comp.year}`),
      sectionHeading("النتائج النهائية"),
      results.length ? resultsTable : new Paragraph({ bidirectional: true, text: "لم يتم نشر النتائج بعد." }),
    ]);

    return Packer.toBuffer(doc);
  }

  // ==========================================================================
  // 7) وورد: تقرير عام (لوحة تحكم) لأداء المدرسة
  // ==========================================================================
  async dashboardWord(monthKey?: string): Promise<Buffer> {
    const schoolName = await this.schoolName();
    const [totalGroups, totalEduGroups, totalStudents] = await Promise.all([
      this.groupModel.countDocuments(),
      this.eduGroupModel.countDocuments(),
      this.studentModel.countDocuments(),
    ]);

    const attendanceFilter: any = monthKey ? { date: { $regex: `^${monthKey}` } } : {};
    const attendanceRecords = await this.attendanceModel.find(attendanceFilter).lean();
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === "حاضر").length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    let paidThisMonth = 0;
    if (monthKey) {
      const paidRecords = await this.paymentModel.find({ month_key: monthKey, status: "paid" }).lean();
      paidThisMonth = paidRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    }

    const statsTable = buildTable(
      ["المؤشر", "القيمة"],
      [
        ["عدد حلقات التحفيظ", String(totalGroups)],
        ["عدد المجموعات التعليمية", String(totalEduGroups)],
        ["إجمالي الطلاب", String(totalStudents)],
        ["نسبة الحضور", `${attendanceRate}%`],
        ...(monthKey ? [["إجمالي المحصّل هذا الشهر", `${paidThisMonth} جنيه`]] : []),
      ],
    );

    const doc = buildDocument(schoolName, [
      ...buildTitlePage(schoolName, "التقرير العام للإدارة", monthKey ? `شهر ${monthKey}` : undefined),
      sectionHeading("المؤشرات العامة"),
      statsTable,
    ]);

    return Packer.toBuffer(doc);
  }
}
