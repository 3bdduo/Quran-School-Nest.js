import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AttendanceRecord, Student } from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

const CONSECUTIVE_ABSENCE_ALERT_THRESHOLD = 3;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecord>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ============================================================================
  // أوتوميشن: لو الطالب غاب 3 مرات على التوالي، بنبعت تنبيه تلقائي لحلقته
  // (كانت العملية دي مش موجودة خالص في النسخة القديمة)
  // ============================================================================
  private async checkConsecutiveAbsences(studentId: string) {
    const recent = await this.attendanceModel
      .find({ student_id: studentId })
      .sort({ date: -1 })
      .limit(CONSECUTIVE_ABSENCE_ALERT_THRESHOLD)
      .lean();

    if (recent.length < CONSECUTIVE_ABSENCE_ALERT_THRESHOLD) return;
    const allAbsent = recent.every((r) => r.status === "غائب");
    if (!allAbsent) return;

    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) return;

    await this.notificationsService.notifyGroup(
      student.group_id,
      "تنبيه غياب متكرر",
      `الطالب "${student.name}" غاب ${CONSECUTIVE_ABSENCE_ALERT_THRESHOLD} مرات متتالية، يُرجى المتابعة.`,
    );
  }

  async markOne(user: CurrentUserPayload, studentId: string, date: string, status: string) {
    if (!studentId || !date || !status) throw new BadRequestException("studentId, date, status مطلوبة");

    if (user.role === "teacher") {
      const student = await this.studentModel.findOne({ id: studentId }).lean();
      if (!student || student.group_id !== user.groupId) {
        throw new ForbiddenException("ليس لديك صلاحية لتسجيل حضور هذا الطالب");
      }
    }

    await this.attendanceModel.findOneAndUpdate(
      { student_id: studentId, date },
      { student_id: studentId, date, status },
      { upsert: true },
    );

    if (status === "غائب") await this.checkConsecutiveAbsences(studentId);
    return { message: "تم التسجيل" };
  }

  async markBulk(user: CurrentUserPayload, date: string, entries: { studentId: string; status: string }[]) {
    if (!date || !entries?.length) throw new BadRequestException("date و entries مطلوبة");

    if (user.role === "teacher") {
      const studentIds = entries.map((e) => e.studentId);
      const count = await this.studentModel.countDocuments({ id: { $in: studentIds }, group_id: user.groupId });
      if (count !== studentIds.length) throw new ForbiddenException("بعض الطلاب لا ينتمون لمجموعتك");
    }

    for (const entry of entries) {
      await this.attendanceModel.findOneAndUpdate(
        { student_id: entry.studentId, date },
        { student_id: entry.studentId, date, status: entry.status },
        { upsert: true },
      );
      if (entry.status === "غائب") await this.checkConsecutiveAbsences(entry.studentId);
    }

    return { message: "تم التسجيل", count: entries.length };
  }

  async byStudent(user: CurrentUserPayload, studentId: string, from?: string, to?: string) {
    if (user.role === "teacher") {
      const student = await this.studentModel.findOne({ id: studentId }).lean();
      if (!student || student.group_id !== user.groupId) throw new ForbiddenException("ليس لديك صلاحية");
    }
    const filter: any = { student_id: studentId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    return this.attendanceModel.find(filter, { date: 1, status: 1, _id: 0 }).sort({ date: -1 }).lean();
  }

  async byGroup(user: CurrentUserPayload, groupId: string, date: string) {
    if (!date) throw new BadRequestException("date مطلوب");
    if (user.role === "teacher" && user.groupId !== groupId) throw new ForbiddenException("ليس لديك صلاحية");

    const students = await this.studentModel.find({ group_id: groupId }).lean();
    const studentIds = students.map((s) => s.id);
    const records = await this.attendanceModel.find({ student_id: { $in: studentIds }, date }).lean();
    const statusMap = Object.fromEntries(records.map((r) => [r.student_id, r.status]));

    return students.map((s) => ({ student_id: s.id, student_name: s.name, status: statusMap[s.id] || "غائب" }));
  }

  async rate(user: CurrentUserPayload, studentId: string) {
    if (user.role === "teacher") {
      const student = await this.studentModel.findOne({ id: studentId }).lean();
      if (!student || student.group_id !== user.groupId) throw new ForbiddenException("ليس لديك صلاحية");
    }
    const rows = await this.attendanceModel.find({ student_id: studentId }).lean();
    const total = rows.length;
    const present = rows.filter((r) => r.status === "حاضر").length;
    return { rate: total > 0 ? Math.round((present / total) * 100) : 0, present, total };
  }
}
