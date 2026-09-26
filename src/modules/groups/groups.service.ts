import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import {
  Group, Teacher, Student, AttendanceRecord, MemorizationLog, PaymentRecord,
  EduStudentRef, EduAttendanceRecord, ExamRecord, CompetitionParticipant, CompetitionResult,
} from "../../schemas";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Teacher.name) private readonly teacherModel: Model<Teacher>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecord>,
    @InjectModel(MemorizationLog.name) private readonly memorizationModel: Model<MemorizationLog>,
    @InjectModel(PaymentRecord.name) private readonly paymentModel: Model<PaymentRecord>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
    @InjectModel(EduAttendanceRecord.name) private readonly eduAttendanceModel: Model<EduAttendanceRecord>,
    @InjectModel(ExamRecord.name) private readonly examModel: Model<ExamRecord>,
    @InjectModel(CompetitionParticipant.name) private readonly competitionParticipantModel: Model<CompetitionParticipant>,
    @InjectModel(CompetitionResult.name) private readonly competitionResultModel: Model<CompetitionResult>,
  ) {}

  async findAll() {
    const groups = await this.groupModel.find().sort({ name: 1 }).lean();
    const counts = await this.studentModel.aggregate([{ $group: { _id: "$group_id", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));

    // جلب بيانات المعلمين
    const teacherIds = groups.map((g) => g.teacher_id).filter(Boolean) as string[];
    const teachers = teacherIds.length
      ? await this.teacherModel.find({ id: { $in: teacherIds } }).lean()
      : [];
    const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));

    return groups.map((g) => {
      const teacher = g.teacher_id ? teacherMap[g.teacher_id] : null;
      return {
        id: g.id,
        name: g.name,
        teacherId: g.teacher_id || null,
        teacherName: teacher?.full_name || null,
        teacherUsername: teacher?.username || null,
        studentsCount: countMap[g.id] || 0,
      };
    });
  }

  async findMine(user: CurrentUserPayload) {
    const groupIds: string[] = (user as any).groupIds || [];
    if (!groupIds.length) return [];
    
    const groups = await this.groupModel.find({ id: { $in: groupIds } }).sort({ name: 1 }).lean();
    const counts = await this.studentModel.aggregate([
      { $match: { group_id: { $in: groupIds } } },
      { $group: { _id: "$group_id", count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      teacherId: g.teacher_id || null,
      studentsCount: countMap[g.id] || 0,
    }));
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const groupIds: string[] = (user as any).groupIds || [];
    if (user.role === "teacher" && !groupIds.includes(id)) {
      throw new ForbiddenException("ليس لديك صلاحية");
    }
    const g = await this.groupModel.findOne({ id }).lean();
    if (!g) throw new NotFoundException("المجموعة غير موجودة");
    const students = await this.studentModel.find({ group_id: id }).lean();
    const teacher = g.teacher_id
      ? await this.teacherModel.findOne({ id: g.teacher_id }).lean()
      : null;
    return {
      id: g.id,
      name: g.name,
      teacherId: g.teacher_id || null,
      teacherName: teacher?.full_name || null,
      teacherUsername: teacher?.username || null,
      students,
    };
  }

  async create(body: { name: string; teacherId?: string }) {
    if (!body.name) throw new ConflictException("اسم الحلقة مطلوب");
    const id = uuidv4();

    let teacherUsername: string | undefined;
    if (body.teacherId) {
      const teacher = await this.teacherModel.findOne({ id: body.teacherId }).lean();
      if (!teacher) throw new NotFoundException("المعلم غير موجود");
      if (teacher.teacher_type !== "group") {
        throw new ConflictException('المعلم ده لازم يكون نوعه "معلم حلقة" الأول عشان يتربط بحلقة');
      }
      teacherUsername = teacher.username;
    }

    try {
      await this.groupModel.collection.dropIndex("teacher_username_1");
    } catch {}

    try {
      await this.groupModel.create({
        id,
        name: body.name,
        teacher_id: body.teacherId || null,
        teacher_username: teacherUsername || `group_${id.slice(0, 8)}`,
        teacher_password: "",
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException("يوجد حلقة بنفس الاسم أو البيانات بالفعل");
      }
      throw new BadRequestException(`فشل إنشاء الحلقة: ${err?.message || "خطأ غير متوقع"}`);
    }

    return { id, name: body.name, teacherId: body.teacherId || null };
  }

  async update(id: string, user: CurrentUserPayload, body: { name?: string; teacherId?: string }) {
    const groupIds: string[] = (user as any).groupIds || [];
    if (user.role === "teacher" && !groupIds.includes(id)) {
      throw new ForbiddenException("ليس لديك صلاحية");
    }

    const update: any = {};
    if (user.role === "admin" && body.name) update.name = body.name;
    if (user.role === "admin" && body.teacherId !== undefined) {
      if (body.teacherId) {
        const newTeacher = await this.teacherModel.findOne({ id: body.teacherId }).lean();
        if (!newTeacher) throw new NotFoundException("المعلم غير موجود");
        if (newTeacher.teacher_type !== "group") {
          throw new ConflictException('المعلم ده لازم يكون نوعه "معلم حلقة" الأول عشان يتربط بحلقة');
        }
      }
      update.teacher_id = body.teacherId || null;
    }

    if (Object.keys(update).length === 0) throw new ConflictException("لا يوجد بيانات للتحديث");

    const g = await this.groupModel.findOneAndUpdate({ id }, update, { new: true }).lean();
    if (!g) throw new NotFoundException("المجموعة غير موجودة");

    const teacher = g.teacher_id
      ? await this.teacherModel.findOne({ id: g.teacher_id }).lean()
      : null;

    return {
      id: g.id,
      name: g.name,
      teacherId: g.teacher_id || null,
      teacherName: teacher?.full_name || null,
      teacherUsername: teacher?.username || null,
    };
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

  // ─── نقل طالب من حلقة لأخرى ─────────────────────────────────────
  async transferStudent(studentId: string, toGroupId: string) {
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");

    const toGroup = await this.groupModel.findOne({ id: toGroupId }).lean();
    if (!toGroup) throw new NotFoundException("الحلقة المستهدفة غير موجودة");

    await this.studentModel.updateOne({ id: studentId }, { group_id: toGroupId });
    return {
      message: `تم نقل الطالب "${student.name}" إلى حلقة "${toGroup.name}" بنجاح`,
    };
  }

  // ─── تغيير معلم الحلقة (يظل الطلاب في نفس الحلقة) ───────────────
  async changeTeacher(groupId: string, newTeacherId: string) {
    const group = await this.groupModel.findOne({ id: groupId }).lean();
    if (!group) throw new NotFoundException("الحلقة غير موجودة");

    const newTeacher = await this.teacherModel.findOne({ id: newTeacherId }).lean();
    if (!newTeacher) throw new NotFoundException("المعلم غير موجود");
    if (newTeacher.teacher_type !== "group") {
      throw new ConflictException('المعلم يجب أن يكون من نوع "معلم حلقة" ليُسند إليه الطلاب');
    }

    await this.groupModel.updateOne(
      { id: groupId },
      { teacher_id: newTeacherId, teacher_username: newTeacher.username },
    );

    return {
      message: `تم تغيير معلم الحلقة "${group.name}" إلى "${newTeacher.full_name}" بنجاح`,
      teacherName: newTeacher.full_name,
      teacherUsername: newTeacher.username,
    };
  }
}
