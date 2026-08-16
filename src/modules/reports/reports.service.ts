import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Group, EduGroup, Student, AttendanceRecord, PaymentRecord, MemorizationLog, EduStudentRef } from "../../schemas";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(EduGroup.name) private readonly eduGroupModel: Model<EduGroup>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecord>,
    @InjectModel(PaymentRecord.name) private readonly paymentModel: Model<PaymentRecord>,
    @InjectModel(MemorizationLog.name) private readonly memorizationModel: Model<MemorizationLog>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
  ) {}

  async dashboard(monthKey?: string) {
    const [totalGroups, totalEduGroups, totalStudents, qTeachers, eduTeachers] = await Promise.all([
      this.groupModel.countDocuments(),
      this.eduGroupModel.countDocuments(),
      this.studentModel.countDocuments(),
      this.groupModel.countDocuments(),
      this.eduGroupModel.countDocuments(),
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
      totalGroups, totalEduGroups, totalStudents, totalTeachers: qTeachers + eduTeachers,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
      presentCount: present, totalAttendanceRecords: total, paidThisMonth,
    };
  }

  async studentReport(user: CurrentUserPayload, studentId: string) {
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");

    if (user.role === "teacher") {
      const isRegular = student.group_id === user.groupId;
      let isEdu = false;
      if (user.eduGroupId) {
        const ref = await this.eduStudentRefModel.findOne({ edu_group_id: user.eduGroupId, student_id: studentId }).lean();
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
