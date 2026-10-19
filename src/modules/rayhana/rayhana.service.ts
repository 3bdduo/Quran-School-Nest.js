import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as ExcelJS from "exceljs";
import { RayhanaParticipant, RayhanaLevel, Student, Settings } from "../../schemas";
import {
  addReportHeader,
  styleDataRow,
  styleTableHeaderRow,
  styleWorksheet,
} from "../exports/excel.util";

const LEVEL_LABELS: Record<RayhanaLevel, { label: string; parts: string }> = {
  level_3: { label: "المستوى الأول", parts: "3 أجزاء" },
  level_5: { label: "المستوى الثاني", parts: "5 أجزاء" },
  level_10: { label: "المستوى الثالث", parts: "10 أجزاء" },
  level_20: { label: "المستوى الرابع", parts: "20 جزءاً" },
  level_full: { label: "المستوى الخامس", parts: "القرآن كاملاً" },
};

@Injectable()
export class RayhanaService {
  constructor(
    @InjectModel(RayhanaParticipant.name)
    private readonly rayhanaModel: Model<RayhanaParticipant>,
    @InjectModel(Student.name)
    private readonly studentModel: Model<Student>,
    @InjectModel(Settings.name)
    private readonly settingsModel: Model<Settings>,
  ) {}

  // ── جلب كل بيانات المسابقة لسنة معينة ─────────────────────────────────
  async getData(year?: string) {
    const targetYear = year ?? new Date().getFullYear().toString();

    const participants = await this.rayhanaModel
      .find({ year: targetYear })
      .lean();

    // جلب أسماء الطلاب وحلقاتهم دفعة واحدة
    const studentIds = participants.map((p) => p.student_id);
    const students = await this.studentModel
      .find({ id: { $in: studentIds } })
      .lean();

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const result = participants.map((p) => {
      const stu = studentMap.get(p.student_id);
      return {
        studentId: p.student_id,
        studentName: stu?.name ?? "طالب غير معروف",
        nationalId: stu?.national_id,
        groupName: stu?.group_id ?? undefined,
        currentLevel: p.current_level,
        passed: p.passed,
        promotedAt: p.promoted_at?.toISOString() ?? undefined,
        notes: p.notes ?? undefined,
      };
    });

    return { year: targetYear, students: result };
  }

  // ── تهيئة كل طلاب المدرسة في المسابقة ────────────────────────────────
  async initStudents(year: string) {
    const targetYear = year ?? new Date().getFullYear().toString();

    // جلب كل الطلاب الفعليين (غير المنتظرين)
    const allStudents = await this.studentModel
      .find({ is_waiting: { $ne: true } })
      .lean();

    // جلب من موجود بالفعل
    const existing = await this.rayhanaModel
      .find({ year: targetYear })
      .lean();

    const existingIds = new Set(existing.map((e) => e.student_id));
    const toAdd = allStudents.filter((s) => !existingIds.has(s.id));

    if (toAdd.length === 0) {
      return { message: "كل الطلاب مسجّلون بالفعل في المسابقة", added: 0 };
    }

    const docs = toAdd.map((s) => ({
      student_id: s.id,
      year: targetYear,
      current_level: "level_3" as RayhanaLevel,
      passed: false,
    }));

    await this.rayhanaModel.insertMany(docs, { ordered: false });
    return { message: "تمت التهيئة بنجاح", added: docs.length };
  }

  // ── تحديث مستوى وحالة طالب واحد ──────────────────────────────────────
  async updateStudent(
    studentId: string,
    body: { currentLevel?: RayhanaLevel; passed?: boolean; notes?: string },
    year?: string,
  ) {
    const targetYear = year ?? new Date().getFullYear().toString();

    const update: any = {};
    if (body.currentLevel !== undefined) update.current_level = body.currentLevel;
    if (body.passed !== undefined) update.passed = body.passed;
    if (body.notes !== undefined) update.notes = body.notes;

    // لو فيه تغيير في المستوى نسجّل وقت الترقية
    if (body.currentLevel !== undefined) {
      update.promoted_at = new Date();
    }

    // upsert: لو مش موجود يتضاف تلقائياً
    const doc = await this.rayhanaModel
      .findOneAndUpdate(
        { student_id: studentId, year: targetYear },
        { $set: update },
        { upsert: true, new: true },
      )
      .lean();

    const stu = await this.studentModel.findOne({ id: studentId }).lean();
    return {
      studentId: doc.student_id,
      studentName: stu?.name ?? "طالب",
      nationalId: stu?.national_id,
      currentLevel: doc.current_level,
      passed: doc.passed,
      promotedAt: doc.promoted_at?.toISOString() ?? undefined,
      notes: doc.notes ?? undefined,
    };
  }

  // ── ترقية مجموعة طلاب دفعة واحدة ────────────────────────────────────
  async bulkPromote(
    studentIds: string[],
    toLevel: RayhanaLevel,
    year?: string,
  ) {
    if (!studentIds?.length) {
      throw new BadRequestException("يجب تحديد طالب واحد على الأقل");
    }

    const validLevels: RayhanaLevel[] = [
      "level_3",
      "level_5",
      "level_10",
      "level_20",
      "level_full",
    ];
    if (!validLevels.includes(toLevel)) {
      throw new BadRequestException("مستوى غير صحيح");
    }

    const targetYear = year ?? new Date().getFullYear().toString();

    const result = await this.rayhanaModel.updateMany(
      { student_id: { $in: studentIds }, year: targetYear },
      {
        $set: {
          current_level: toLevel,
          passed: false,
          promoted_at: new Date(),
        },
      },
    );

    return {
      message: "تمت الترقية الجماعية بنجاح",
      updated: result.modifiedCount,
    };
  }

  // ── إزالة طالب من المسابقة ────────────────────────────────────────────
  async removeStudent(studentId: string, year?: string) {
    const targetYear = year ?? new Date().getFullYear().toString();

    const doc = await this.rayhanaModel
      .findOneAndDelete({ student_id: studentId, year: targetYear })
      .lean();

    if (!doc) throw new NotFoundException("الطالب غير مسجّل في المسابقة");
    return { message: "تمت الإزالة بنجاح" };
  }

  // ── تصدير ملف إكسل احترافي لمسابقة ريحانة المدينة ────────────────────────
  async exportExcel(year?: string): Promise<ExcelJS.Buffer> {
    const targetYear = year ?? new Date().getFullYear().toString();
    const data = await this.getData(targetYear);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Quran School Management System";
    const sheet = workbook.addWorksheet(`ريحانة المدينة ${targetYear}`);
    styleWorksheet(sheet);

    let schoolName = "مدرسة التربية بالقرءان الكريم";
    try {
      const s = await this.settingsModel.findById(1).lean();
      if (s?.school_name) schoolName = s.school_name;
    } catch {
      // fallback
    }

    addReportHeader(
      sheet,
      schoolName,
      `كشف مسابقة ريحانة المدينة لحفظ القرآن الكريم — عام ${targetYear}`,
      7,
    );

    const headers = [
      "م",
      "اسم الطالب",
      "المستوى",
      "عدد الأجزاء",
      "الحالة",
      "تاريخ آخر ترقية",
      "ملاحظات",
    ];
    const headerRow = sheet.addRow(headers);
    styleTableHeaderRow(headerRow);

    sheet.columns = [
      { key: "num", width: 8 },
      { key: "name", width: 32 },
      { key: "level", width: 20 },
      { key: "parts", width: 16 },
      { key: "status", width: 16 },
      { key: "promotedAt", width: 20 },
      { key: "notes", width: 28 },
    ];

    data.students.forEach((s, idx) => {
      const lvl = LEVEL_LABELS[s.currentLevel as RayhanaLevel];
      const row = sheet.addRow([
        idx + 1,
        s.studentName,
        lvl?.label ?? s.currentLevel,
        lvl?.parts ?? "",
        s.passed ? "ناجح" : "قيد الاختبار",
        s.promotedAt ? new Date(s.promotedAt).toLocaleDateString("ar-EG") : "—",
        s.notes ?? "",
      ]);
      styleDataRow(row, idx % 2 === 1);
    });

    return await workbook.xlsx.writeBuffer();
  }
}
