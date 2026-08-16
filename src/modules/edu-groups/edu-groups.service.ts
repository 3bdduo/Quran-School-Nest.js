import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { EduGroup, EduStudentRef, EduAttendanceRecord, ExamRecord, Student } from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class EduGroupsService {
  constructor(
    @InjectModel(EduGroup.name) private readonly eduGroupModel: Model<EduGroup>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
    @InjectModel(EduAttendanceRecord.name) private readonly eduAttendanceModel: Model<EduAttendanceRecord>,
    @InjectModel(ExamRecord.name) private readonly examModel: Model<ExamRecord>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll() {
    const groups = await this.eduGroupModel.find().sort({ name: 1 }).lean();
    const counts = await this.eduStudentRefModel.aggregate([{ $group: { _id: "$edu_group_id", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    return groups.map((g) => ({
      id: g.id, name: g.name, teacherUsername: g.teacher_username, studentsCount: countMap[g.id] || 0,
    }));
  }

  async findOne(id: string, user: CurrentUserPayload) {
    if (user.role === "teacher" && user.eduGroupId !== id) throw new ForbiddenException("ليس لديك صلاحية");
    const group = await this.eduGroupModel.findOne({ id }).lean();
    if (!group) throw new NotFoundException("المجموعة غير موجودة");

    const refs = await this.eduStudentRefModel.find({ edu_group_id: id }).lean();
    const studentIds = refs.map((r) => r.student_id);
    const studentDocs = await this.studentModel.find({ id: { $in: studentIds } }).lean();
    const nameMap = Object.fromEntries(studentDocs.map((s) => [s.id, s.name]));

    const students = await Promise.all(
      refs.map(async (ref) => {
        const attendance = await this.eduAttendanceModel
          .find({ edu_group_id: id, student_id: ref.student_id }, { date: 1, status: 1, _id: 0 })
          .sort({ date: -1 }).limit(30).lean();
        const exams = await this.examModel
          .find({ edu_group_id: id, student_id: ref.student_id }, { id: 1, name: 1, score: 1, max_score: 1, date: 1, _id: 0 })
          .sort({ date: -1 }).lean();
        return { studentId: ref.student_id, studentName: nameMap[ref.student_id], attendanceRecords: attendance, examRecords: exams };
      }),
    );

    return { id: group.id, name: group.name, teacherUsername: group.teacher_username, students };
  }

  async create(body: { name: string; teacherUsername: string; teacherPassword: string }) {
    if (!body.name || !body.teacherUsername || !body.teacherPassword) {
      throw new ConflictException("جميع الحقول مطلوبة");
    }
    const id = uuidv4();
    const hashed = await bcrypt.hash(body.teacherPassword, 10);
    try {
      await this.eduGroupModel.create({ id, name: body.name, teacher_username: body.teacherUsername, teacher_password: hashed });
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("اسم المستخدم موجود بالفعل");
      throw err;
    }
    await this.notificationsService.notifyTeacher(
      body.teacherUsername,
      "تم إنشاء حساب مجموعتك التعليمية",
      `تم إنشاء مجموعة "${body.name}" وربطها بحسابك.`,
    );
    return { id, name: body.name, teacherUsername: body.teacherUsername };
  }

  async update(id: string, user: CurrentUserPayload, body: { name?: string; teacherUsername?: string; teacherPassword?: string }) {
    if (user.role === "teacher" && user.eduGroupId !== id) throw new ForbiddenException("ليس لديك صلاحية");

    const update: any = {};
    if (user.role === "admin" && body.name) update.name = body.name;
    if (body.teacherUsername) update.teacher_username = body.teacherUsername;
    if (body.teacherPassword) update.teacher_password = await bcrypt.hash(body.teacherPassword, 10);
    if (Object.keys(update).length === 0) throw new ConflictException("لا يوجد بيانات للتحديث");

    let g;
    try {
      g = await this.eduGroupModel.findOneAndUpdate({ id }, update, { new: true }).lean();
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("اسم المستخدم موجود بالفعل");
      throw err;
    }
    if (!g) throw new NotFoundException("المجموعة غير موجودة");
    return g;
  }

  async remove(id: string) {
    await this.eduGroupModel.deleteOne({ id });
    await this.eduStudentRefModel.deleteMany({ edu_group_id: id });
    await this.eduAttendanceModel.deleteMany({ edu_group_id: id });
    await this.examModel.deleteMany({ edu_group_id: id });
  }

  async addStudent(id: string, user: CurrentUserPayload, studentId: string) {
    if (user.role === "teacher" && user.eduGroupId !== id) throw new ForbiddenException("ليس لديك صلاحية");
    await this.eduStudentRefModel.findOneAndUpdate(
      { edu_group_id: id, student_id: studentId },
      { edu_group_id: id, student_id: studentId },
      { upsert: true },
    );
    return { message: "تم الإضافة" };
  }

  async removeStudent(id: string, user: CurrentUserPayload, studentId: string) {
    if (user.role === "teacher" && user.eduGroupId !== id) throw new ForbiddenException("ليس لديك صلاحية");
    await this.eduStudentRefModel.deleteOne({ edu_group_id: id, student_id: studentId });
  }
}
