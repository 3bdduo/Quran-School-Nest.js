import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Group, EduGroup, Student, Teacher,
  AttendanceRecord, PaymentRecord, MemorizationLog, EduStudentRef,
} from "../../schemas";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(EduGroup.name) private readonly eduGroupModel: Model<EduGroup>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Teacher.name) private readonly teacherModel: Model<Teacher>,
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecord>,
    @InjectModel(PaymentRecord.name) private readonly paymentModel: Model<PaymentRecord>,
    @InjectModel(MemorizationLog.name) private readonly memorizationModel: Model<MemorizationLog>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
  ) {}

  async dashboard(monthKey?: string) {
    const [totalGroups, totalEduGroups, totalStudents, totalTeachers] = await Promise.all([
      this.groupModel.countDocuments(),
      this.eduGroupModel.countDocuments(),
      this.studentModel.countDocuments(),
      this.teacherModel.countDocuments(),
    ]);

    const attendanceFilter: any = monthKey ? { date: { $regex: `^${monthKey}` } } : {};
    const attendanceRecords = await this.attendanceModel.find(attendanceFilter).lean();
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === "حاضر").length;

    let paidThisMonth = 0;
    if (monthKey) {
      const paidRecords = await this.paymentModel.find({ month_key: monthKey, status: "paid" }).lean();
      paidThisMonth = paidRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    }

    return {
      totalGroups, totalEduGroups, totalStudents, totalTeachers,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
      presentCount: present, totalAttendanceRecords: total, paidThisMonth,
    };
  }

  // Dashboard 1 — توزيع الطلاب حسب الفئة العمرية
  async dashboardAgeGroups() {
    const students = await this.studentModel.find({}, { age: 1 }).lean();
    const brackets = [
      { label: "أقل من 10", min: 0, max: 9 },
      { label: "10 - 14", min: 10, max: 14 },
      { label: "15 - 17", min: 15, max: 17 },
      { label: "18 - 25", min: 18, max: 25 },
      { label: "أكثر من 25", min: 26, max: 999 },
    ];
    return brackets.map((b) => ({
      label: b.label,
      count: students.filter((s) => Number(s.age) >= b.min && Number(s.age) <= b.max).length,
    }));
  }

  // Dashboard 2 — توزيع الطلاب حسب الكم المحفوظ
  async dashboardMemorization() {
    const students = await this.studentModel.find({}, { memorized_amount: 1 }).lean();
    const parseJuz = (s: string) => {
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };
    const brackets = [
      { label: "0 أجزاء", min: 0, max: 0 },
      { label: "1 - 5 أجزاء", min: 1, max: 5 },
      { label: "6 - 15 جزء", min: 6, max: 15 },
      { label: "16 - 29 جزء", min: 16, max: 29 },
      { label: "30 جزء", min: 30, max: 30 },
    ];
    return brackets.map((b) => ({
      label: b.label,
      count: students.filter((s) => {
        const v = parseJuz(s.memorized_amount);
        return v >= b.min && v <= b.max;
      }).length,
    }));
  }

  // Dashboard 3 — الحضور والغياب اليومي (آخر 30 يوم)
  async dashboardAttendance() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);
    const records = await this.attendanceModel.find({ date: { $gte: dateStr } }).lean();

    const dayMap: Record<string, { present: number; absent: number; excused: number }> = {};
    records.forEach((r) => {
      if (!dayMap[r.date]) dayMap[r.date] = { present: 0, absent: 0, excused: 0 };
      if (r.status === "حاضر") dayMap[r.date].present++;
      else if (r.status === "غائب") dayMap[r.date].absent++;
      else dayMap[r.date].excused++;
    });

    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));
  }

  // Dashboard 4 — ملخص المدفوعات للشهر الحالي
  async dashboardPayments(monthKey?: string) {
    const key = monthKey || new Date().toISOString().slice(0, 7);
    const payments = await this.paymentModel.find({ month_key: key }).lean();
    const paid = payments.filter((p) => p.status === "paid");
    const unpaid = payments.filter((p) => p.status === "unpaid");
    const exempt = payments.filter((p) => p.status === "exempt");
    return {
      monthKey: key,
      paid: { count: paid.length, amount: paid.reduce((s, p) => s + (Number(p.amount) || 0), 0) },
      unpaid: { count: unpaid.length, amount: unpaid.reduce((s, p) => s + (Number(p.amount) || 0), 0) },
      exempt: { count: exempt.length },
      total: payments.length,
    };
  }

  async studentReport(user: CurrentUserPayload, studentId: string) {
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");

    if (user.role === "teacher") {
      const groupIds: string[] = (user as any).groupIds || [];
      const isRegular = groupIds.includes(student.group_id);
      let isEdu = false;
      if (!isRegular && user.teacherId) {
        const ref = await this.eduStudentRefModel.findOne({ student_id: studentId }).lean();
        if (ref) isEdu = true;
      }
      if (!isRegular && !isEdu) throw new ForbiddenException("ليس لديك صلاحية");
    }

    const [attendance, memorization, payments] = await Promise.all([
      this.attendanceModel.find({ student_id: studentId }, { date: 1, status: 1, _id: 0 }).sort({ date: -1 }).lean(),
      this.memorizationModel.find({ student_id: studentId }).sort({ date: -1 }).lean(),
      this.paymentModel.find({ student_id: studentId }).lean(),
    ]);

    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "حاضر").length;
    const paidMonths = payments.filter((p) => p.status === "paid").length;

    return {
      ...student, attendanceRecords: attendance, memorizationLog: memorization, payments,
      stats: {
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0, present, total,
        paidMonths, unpaidMonths: payments.filter((p) => p.status === "unpaid").length,
      },
    };
  }
}
