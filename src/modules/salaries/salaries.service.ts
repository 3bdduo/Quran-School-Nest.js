import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TeacherSalaryConfig, TeacherSalaryRecord } from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class SalariesService {
  constructor(
    @InjectModel(TeacherSalaryConfig.name) private readonly configModel: Model<TeacherSalaryConfig>,
    @InjectModel(TeacherSalaryRecord.name) private readonly recordModel: Model<TeacherSalaryRecord>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async allTeachers() {
    const rows = await this.configModel.find().lean();
    return rows.map((r) => ({ username: r.teacher_username, base_salary: r.base_salary, notes: r.notes }));
  }

  async oneTeacher(username: string) {
    const row = await this.configModel.findOne({ teacher_username: username }).lean();
    if (!row) throw new NotFoundException("المعلم غير موجود");
    return { username: row.teacher_username, base_salary: row.base_salary, notes: row.notes };
  }

  async me(username: string) {
    const row = await this.configModel.findOne({ teacher_username: username }).lean();
    if (!row) return { username, base_salary: 0, notes: null };
    return { username: row.teacher_username, base_salary: row.base_salary, notes: row.notes };
  }

  async setConfig(username: string, baseSalary: number, notes?: string) {
    await this.configModel.findOneAndUpdate(
      { teacher_username: username },
      { teacher_username: username, base_salary: baseSalary, notes: notes || null },
      { upsert: true },
    );
    return { username, baseSalary, notes };
  }

  async history(username: string) {
    return this.recordModel.find({ teacher_username: username }).sort({ month_key: -1 }).lean();
  }

  async byMonth(monthKey: string) {
    const configs = await this.configModel.find().lean();
    const records = await this.recordModel.find({ month_key: monthKey }).lean();
    const recordMap = Object.fromEntries(records.map((r) => [r.teacher_username, r]));

    const teachers = configs.map((c) => {
      const rec: any = recordMap[c.teacher_username];
      return {
        username: c.teacher_username, baseSalary: c.base_salary,
        status: rec?.status || "unpaid", amount: rec?.amount || 0,
        paidDate: rec?.paid_date || null, paidBy: rec?.paid_by || null,
      };
    });

    return {
      monthKey, totalTeachers: teachers.length,
      paidCount: teachers.filter((t) => t.status === "paid").length,
      unpaidCount: teachers.filter((t) => t.status === "unpaid").length,
      advanceCount: teachers.filter((t) => t.status === "advance").length,
      totalPaidAmount: teachers.reduce((sum, t) => sum + (t.status === "paid" ? Number(t.amount) : 0), 0),
      teachers,
    };
  }

  async setMonth(username: string, monthKey: string, body: any) {
    const config = await this.configModel.findOne({ teacher_username: username }).lean();
    const baseSalary = config?.base_salary || 0;

    const record = await this.recordModel.findOneAndUpdate(
      { teacher_username: username, month_key: monthKey },
      {
        teacher_username: username, month_key: monthKey, status: body.status, amount: body.amount,
        base_salary: baseSalary, paid_date: body.paidDate || null, note: body.note || null, paid_by: body.paidBy || null,
      },
      { upsert: true, new: true },
    ).lean();

    // أوتوميشن: إشعار المدرس أوتوماتيك لما راتبه يتسجل مدفوع
    if (body.status === "paid") {
      await this.notificationsService.notifyTeacher(
        username, "تم صرف راتبك",
        `تم صرف راتب شهر ${monthKey} بمبلغ ${body.amount ?? baseSalary} جنيه.`,
      );
    }

    return record;
  }

  async deleteMonth(username: string, monthKey: string) {
    await this.recordModel.deleteOne({ teacher_username: username, month_key: monthKey });
  }
}
