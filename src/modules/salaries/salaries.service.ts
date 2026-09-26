import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Teacher, TeacherSalaryConfig, TeacherSalaryRecord } from "../../schemas";


@Injectable()
export class SalariesService {
  constructor(
    @InjectModel(Teacher.name) private readonly teacherModel: Model<Teacher>,
    @InjectModel(TeacherSalaryConfig.name) private readonly configModel: Model<TeacherSalaryConfig>,
    @InjectModel(TeacherSalaryRecord.name) private readonly recordModel: Model<TeacherSalaryRecord>,

  ) {}

  private computeNet(base: number, incentive: number, deduction: number) {
    return Math.max(0, (base || 0) + (incentive || 0) - (deduction || 0));
  }

  async allTeachers() {
    const teachers = await this.teacherModel.find().lean();
    const configs = await this.configModel.find().lean();
    const configMap = Object.fromEntries(configs.map((c) => [c.teacher_username, c]));
    return teachers.map((t) => {
      const cfg = configMap[t.username];
      return {
        id: t.id,
        username: t.username,
        full_name: t.full_name,
        national_id: t.national_id,
        base_salary: cfg?.base_salary || 0,
        notes: cfg?.notes || null,
      };
    });
  }

  async oneTeacher(username: string) {
    const teacher = await this.teacherModel.findOne({ username }).lean();
    if (!teacher) throw new NotFoundException("المعلم غير موجود");
    const cfg = await this.configModel.findOne({ teacher_username: username }).lean();
    return {
      id: teacher.id,
      username: teacher.username,
      full_name: teacher.full_name,
      national_id: teacher.national_id,
      base_salary: cfg?.base_salary || 0,
      notes: cfg?.notes || null,
    };
  }

  async me(username: string) {
    const cfg = await this.configModel.findOne({ teacher_username: username }).lean();
    const teacher = await this.teacherModel.findOne({ username }).lean();
    let baseSalary = cfg?.base_salary || 0;
    if (!baseSalary) {
      const latestRecord = await this.recordModel.findOne({ teacher_username: username }).sort({ month_key: -1 }).lean();
      if (latestRecord?.base_salary) {
        baseSalary = latestRecord.base_salary;
      }
    }
    return {
      username,
      full_name: teacher?.full_name || username,
      base_salary: baseSalary,
      notes: cfg?.notes || null,
    };
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
    const teachers = await this.teacherModel.find().lean();
    const configs = await this.configModel.find().lean();
    const records = await this.recordModel.find({ month_key: monthKey }).lean();
    const configMap = Object.fromEntries(configs.map((c) => [c.teacher_username, c]));
    const recordMap = Object.fromEntries(records.map((r) => [r.teacher_username, r]));

    const result = teachers.map((t) => {
      const cfg = configMap[t.username];
      const rec: any = recordMap[t.username];
      const base = rec?.base_salary !== undefined && rec?.base_salary !== null ? rec.base_salary : (cfg?.base_salary || 0);
      const incentive = rec?.incentive_amount || 0;
      const deduction = rec?.deduction_amount || 0;
      const net = rec?.net_salary !== undefined && rec?.net_salary !== null ? rec.net_salary : this.computeNet(base, incentive, deduction);
      return {
        id: t.id,
        username: t.username,
        full_name: t.full_name,
        national_id: t.national_id,
        baseSalary: base,
        incentiveAmount: incentive,
        incentiveReason: rec?.incentive_reason || null,
        deductionAmount: deduction,
        deductionReason: rec?.deduction_reason || null,
        netSalary: net,
        status: rec?.status || "unpaid",
        amount: rec?.amount || 0,
        paidDate: rec?.paid_date || null,
        paidBy: rec?.paid_by || null,
        note: rec?.note || null,
      };
    });

    return {
      monthKey,
      totalTeachers: result.length,
      paidCount: result.filter((t) => t.status === "paid").length,
      unpaidCount: result.filter((t) => t.status === "unpaid").length,
      advanceCount: result.filter((t) => t.status === "advance").length,
      totalPaidAmount: result.reduce((s, t) => s + (t.status === "paid" ? Number(t.amount) : 0), 0),
      teachers: result,
    };
  }

  async setMonth(username: string, monthKey: string, body: any) {
    if (body.baseSalary !== undefined && body.baseSalary !== null && !isNaN(Number(body.baseSalary))) {
      await this.configModel.findOneAndUpdate(
        { teacher_username: username },
        { teacher_username: username, base_salary: Number(body.baseSalary) },
        { upsert: true }
      );
    }
    const config = await this.configModel.findOne({ teacher_username: username }).lean();
    const baseSalary = body.baseSalary !== undefined && body.baseSalary !== null && !isNaN(Number(body.baseSalary))
      ? Number(body.baseSalary)
      : (config?.base_salary || 0);
    const incentiveAmount = Number(body.incentiveAmount) || 0;
    const deductionAmount = Number(body.deductionAmount) || 0;
    const netSalary = this.computeNet(baseSalary, incentiveAmount, deductionAmount);

    const record = await this.recordModel.findOneAndUpdate(
      { teacher_username: username, month_key: monthKey },
      {
        teacher_username: username,
        month_key: monthKey,
        status: body.status || "paid",
        base_salary: baseSalary,
        incentive_amount: incentiveAmount,
        incentive_reason: body.incentiveReason || null,
        deduction_amount: deductionAmount,
        deduction_reason: body.deductionReason || null,
        net_salary: netSalary,
        amount: body.amount !== undefined && body.amount !== null ? Number(body.amount) : netSalary,
        paid_date: body.paidDate || null,
        note: body.note || null,
        paid_by: body.paidBy || null,
      },
      { upsert: true, new: true },
    ).lean();

    return record;
  }

  async deleteMonth(username: string, monthKey: string) {
    await this.recordModel.deleteOne({ teacher_username: username, month_key: monthKey });
  }
}
