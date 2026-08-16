import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import {
  Group, Student, AttendanceRecord, MemorizationLog, PaymentRecord,
  EduStudentRef, EduAttendanceRecord, ExamRecord, CompetitionParticipant, CompetitionResult,
} from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecord>,
    @InjectModel(MemorizationLog.name) private readonly memorizationModel: Model<MemorizationLog>,
    @InjectModel(PaymentRecord.name) private readonly paymentModel: Model<PaymentRecord>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
    @InjectModel(EduAttendanceRecord.name) private readonly eduAttendanceModel: Model<EduAttendanceRecord>,
    @InjectModel(ExamRecord.name) private readonly examModel: Model<ExamRecord>,
    @InjectModel(CompetitionParticipant.name) private readonly competitionParticipantModel: Model<CompetitionParticipant>,
    @InjectModel(CompetitionResult.name) private readonly competitionResultModel: Model<CompetitionResult>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll() {
    const groups = await this.groupModel.find().sort({ name: 1 }).lean();
    const counts = await this.studentModel.aggregate([{ $group: { _id: "$group_id", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    return groups.map((g) => ({
      id: g.id, name: g.name, teacherUsername: g.teacher_username, studentsCount: countMap[g.id] || 0,
    }));
  }

  async findOne(id: string, user: CurrentUserPayload) {
    if (user.role === "teacher" && user.groupId !== id) throw new ForbiddenException("ليس لديك صلاحية");
    const g = await this.groupModel.findOne({ id }).lean();
    if (!g) throw new NotFoundException("المجموعة غير موجودة");
    const students = await this.studentModel.find({ group_id: id }).lean();
    return { id: g.id, name: g.name, teacherUsername: g.teacher_username, students };
  }

  async create(body: { name: string; teacherUsername: string; teacherPassword: string }) {
    if (!body.name || !body.teacherUsername || !body.teacherPassword) {
      throw new ConflictException("جميع الحقول مطلوبة");
    }
    const id = uuidv4();
    const hashed = await bcrypt.hash(body.teacherPassword, 10);
    try {
      await this.groupModel.create({ id, name: body.name, teacher_username: body.teacherUsername, teacher_password: hashed });
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("اسم المستخدم موجود بالفعل");
      throw err;
    }

    // أوتوميشن: نبعت إشعار ترحيبي للمدرس الجديد أوتوماتيك
    await this.notificationsService.notifyTeacher(
      body.teacherUsername,
      "تم إنشاء حساب حلقتك",
      `تم إنشاء حلقة "${body.name}" وربطها بحسابك. يمكنك تسجيل الدخول الآن.`,
    );

    return { id, name: body.name, teacherUsername: body.teacherUsername };
  }

  async update(id: string, user: CurrentUserPayload, body: { name?: string; teacherUsername?: string; teacherPassword?: string }) {
    if (user.role === "teacher" && user.groupId !== id) throw new ForbiddenException("ليس لديك صلاحية");

    const update: any = {};
    if (user.role === "admin" && body.name) update.name = body.name;
    if (body.teacherUsername) update.teacher_username = body.teacherUsername;
    if (body.teacherPassword) update.teacher_password = await bcrypt.hash(body.teacherPassword, 10);

    if (Object.keys(update).length === 0) throw new ConflictException("لا يوجد بيانات للتحديث");

    let g;
    try {
      g = await this.groupModel.findOneAndUpdate({ id }, update, { new: true }).lean();
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("اسم المستخدم موجود بالفعل");
      throw err;
    }
    if (!g) throw new NotFoundException("المجموعة غير موجودة");
    return { id: g.id, name: g.name, teacherUsername: g.teacher_username };
  }

  async remove(id: string) {
    const students = await this.studentModel.find({ group_id: id }).lean();
    const studentIds = students.map((s) => s.id);

    if (studentIds.length) {
      await Promise.all([
        this.attendanceModel.deleteMany({ student_id: { $in: studentIds } }),
        this.memorizationModel.deleteMany({ student_id: { $in: studentIds } }),
        this.paymentModel.deleteMany({ student_id: { $in: studentIds } }),
        this.eduStudentRefModel.deleteMany({ student_id: { $in: studentIds } }),
        this.eduAttendanceModel.deleteMany({ student_id: { $in: studentIds } }),
        this.examModel.deleteMany({ student_id: { $in: studentIds } }),
        this.competitionParticipantModel.deleteMany({ student_id: { $in: studentIds } }),
        this.competitionResultModel.deleteMany({ student_id: { $in: studentIds } }),
        this.studentModel.deleteMany({ group_id: id }),
      ]);
    }
    await this.groupModel.deleteOne({ id });
  }
}
