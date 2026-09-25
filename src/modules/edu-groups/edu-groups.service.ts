import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { EduGroup, EduStudentRef, EduAttendanceRecord, ExamRecord, Student, Teacher, Group } from "../../schemas";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

const ARABIC_TO_LATIN: Record<string, string> = {
  ا: "a", أ: "a", إ: "a", آ: "a", ى: "a",
  ب: "b", ت: "t", ث: "th", ج: "j", ح: "h",
  خ: "kh", د: "d", ذ: "z", ر: "r", ز: "z",
  س: "s", ش: "sh", ص: "s", ض: "d", ط: "t",
  ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "q",
  ك: "k", ل: "l", م: "m", ن: "n", ه: "h",
  و: "w", ي: "y", ئ: "y", ء: "", ة: "a",
  لا: "la", " ": ".",
};

function transliterate(arabic: string): string {
  let result = "";
  for (const ch of arabic) {
    result += ARABIC_TO_LATIN[ch] ?? ch;
  }
  return result.replace(/[^a-z0-9.]/gi, "").toLowerCase();
}

function generateUsername(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = transliterate(parts[0]?.charAt(0) || "edu");
  const second = transliterate(parts[1] || parts[0] || "teacher");
  return `${first}.${second}`.slice(0, 20);
}

@Injectable()
export class EduGroupsService {
  constructor(
    @InjectModel(EduGroup.name) private readonly eduGroupModel: Model<EduGroup>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
    @InjectModel(EduAttendanceRecord.name) private readonly eduAttendanceModel: Model<EduAttendanceRecord>,
    @InjectModel(ExamRecord.name) private readonly examModel: Model<ExamRecord>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Teacher.name) private readonly teacherModel: Model<Teacher>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
  ) {}

  async findAll() {
    const groups = await this.eduGroupModel.find().sort({ name: 1 }).lean();
    const counts = await this.eduStudentRefModel.aggregate([{ $group: { _id: "$edu_group_id", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      teacherId: g.teacher_id,
      teacherName: g.teacher_name || g.teacher_username,
      teacherUsername: g.teacher_username,
      teacherNationalId: g.teacher_national_id || "",
      teacherPhone: g.teacher_phone || "",
      studentsCount: countMap[g.id] || 0,
    }));
  }

  async findOne(id: string, user: CurrentUserPayload) {
    if (user.role === "teacher" && user.eduGroupId !== id) throw new ForbiddenException("ليس لديك صلاحية");
    const group = await this.eduGroupModel.findOne({ id }).lean();
    if (!group) throw new NotFoundException("المجموعة غير موجودة");

    const refs = await this.eduStudentRefModel.find({ edu_group_id: id }).lean();
    const studentIds = refs.map((r) => r.student_id);
    const [studentDocs, allGroups] = await Promise.all([
      this.studentModel.find({ id: { $in: studentIds } }).lean(),
      this.groupModel.find().lean(),
    ]);

    const groupMap = Object.fromEntries(allGroups.map((g) => [g.id, g.name]));
    const studentMap = Object.fromEntries(studentDocs.map((s) => [s.id, s]));

    const students = await Promise.all(
      refs.map(async (ref) => {
        const s = studentMap[ref.student_id];
        const attendance = await this.eduAttendanceModel
          .find({ edu_group_id: id, student_id: ref.student_id }, { date: 1, status: 1, _id: 0 })
          .sort({ date: -1 }).limit(30).lean();
        const exams = await this.examModel
          .find({ edu_group_id: id, student_id: ref.student_id }, { id: 1, name: 1, score: 1, max_score: 1, date: 1, _id: 0 })
          .sort({ date: -1 }).lean();

        // استنتاج النوع بناءً على الرقم القومي أو الاسم إن لم يكن محدداً
        let gender = s?.gender;
        if (!gender && s?.national_id && s.national_id.length === 14) {
          const digit = parseInt(s.national_id.charAt(12), 10);
          if (!isNaN(digit)) gender = digit % 2 !== 0 ? "male" : "female";
        }

        return {
          studentId: ref.student_id,
          studentName: s?.name || ref.student_id,
          studentNationalId: s?.national_id || "",
          studentPhone: s?.phone || "",
          groupName: s ? groupMap[s.group_id] || "غير محدد" : "غير محدد",
          gender: gender || "male",
          attendanceRecords: attendance,
          examRecords: exams,
        };
      }),
    );

    return {
      id: group.id,
      name: group.name,
      teacherId: group.teacher_id,
      teacherName: group.teacher_name || group.teacher_username,
      teacherUsername: group.teacher_username,
      teacherNationalId: group.teacher_national_id || "",
      teacherPhone: group.teacher_phone || "",
      students,
    };
  }

  async create(body: {
    name: string;
    teacherName: string;
    nationalId?: string;
    phone?: string;
    teacherUsername?: string;
    teacherPassword: string;
  }) {
    if (!body.name || !body.teacherName || !body.teacherPassword) {
      throw new ConflictException("اسم المجموعة واسم المعلم وكلمة المرور مطلوبة");
    }

    const id = uuidv4();
    const teacherId = uuidv4();
    const hashed = await bcrypt.hash(body.teacherPassword, 10);

    // توليد username إن لم يكن مُعطى
    let username = body.teacherUsername?.trim();
    if (!username) {
      let baseUsername = generateUsername(body.teacherName);
      username = baseUsername;
      let counter = 1;
      while (
        (await this.teacherModel.findOne({ username }).lean()) ||
        (await this.eduGroupModel.findOne({ teacher_username: username }).lean())
      ) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
    }

    // إنشاء حساب المعلم في collection الـ teachers عشان يقدر يسجل دخول كمعلم عادي
    const nationalId = body.nationalId?.trim() || `EDU${Date.now().toString().slice(-11)}`;
    try {
      await this.teacherModel.create({
        id: teacherId,
        full_name: body.teacherName.trim(),
        national_id: nationalId,
        phone: body.phone?.trim() || null,
        username,
        password: hashed,
        teacher_type: "other", // معلم عادي للمجموعات التربوية
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // إذا كان المعلم موجوداً بالفعل بالرقم القومي، نجلب حسابه ونربطه
        const existingTeacher = await this.teacherModel.findOne({ national_id: nationalId }).lean();
        if (existingTeacher) {
          username = existingTeacher.username;
        }
      }
    }

    try {
      await this.eduGroupModel.create({
        id,
        name: body.name.trim(),
        teacher_id: teacherId,
        teacher_name: body.teacherName.trim(),
        teacher_national_id: nationalId,
        teacher_phone: body.phone?.trim() || "",
        teacher_username: username,
        teacher_password: hashed,
      });
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("اسم المستخدم أو المجموعة موجود بالفعل");
      throw err;
    }

    return {
      id,
      name: body.name,
      teacherName: body.teacherName,
      teacherUsername: username,
      teacherNationalId: nationalId,
      teacherPhone: body.phone,
    };
  }

  async update(
    id: string,
    user: CurrentUserPayload,
    body: {
      name?: string;
      teacherName?: string;
      nationalId?: string;
      phone?: string;
      teacherUsername?: string;
      teacherPassword?: string;
    },
  ) {
    if (user.role === "teacher" && user.eduGroupId !== id) throw new ForbiddenException("ليس لديك صلاحية");

    const update: any = {};
    if (user.role === "admin" && body.name) update.name = body.name;
    if (body.teacherName) update.teacher_name = body.teacherName;
    if (body.nationalId) update.teacher_national_id = body.nationalId;
    if (body.phone !== undefined) update.teacher_phone = body.phone;
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

    // تحديث حساب المعلم المرتبط إن وُجد
    if (g.teacher_id || g.teacher_username) {
      const teacherUpdate: any = {};
      if (body.teacherName) teacherUpdate.full_name = body.teacherName;
      if (body.nationalId) teacherUpdate.national_id = body.nationalId;
      if (body.phone !== undefined) teacherUpdate.phone = body.phone;
      if (body.teacherUsername) teacherUpdate.username = body.teacherUsername;
      if (body.teacherPassword) teacherUpdate.password = update.teacher_password;
      if (Object.keys(teacherUpdate).length > 0) {
        await this.teacherModel.updateOne(
          { $or: [{ id: g.teacher_id }, { username: g.teacher_username }] },
          teacherUpdate,
        ).catch(() => undefined);
      }
    }

    return g;
  }

  async remove(id: string) {
    const group = await this.eduGroupModel.findOne({ id }).lean();
    if (group?.teacher_id) {
      await this.teacherModel.deleteOne({ id: group.teacher_id }).catch(() => undefined);
    }
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
    return { message: "تمت إضافة الطالب للمجموعة بنجاح" };
  }

  async bulkAddStudents(id: string, user: CurrentUserPayload, studentIds: string[]) {
    if (user.role === "teacher" && user.eduGroupId !== id) throw new ForbiddenException("ليس لديك صلاحية");
    if (!studentIds || !studentIds.length) return { count: 0 };

    const operations = studentIds.map((sid) => ({
      updateOne: {
        filter: { edu_group_id: id, student_id: sid },
        update: { $set: { edu_group_id: id, student_id: sid } },
        upsert: true,
      },
    }));

    await this.eduStudentRefModel.bulkWrite(operations);
    return { message: "تمت إضافة الطلاب المحددين بنجاح", count: studentIds.length };
  }

  async removeStudent(id: string, user: CurrentUserPayload, studentId: string) {
    if (user.role === "teacher" && user.eduGroupId !== id) throw new ForbiddenException("ليس لديك صلاحية");
    await this.eduStudentRefModel.deleteOne({ edu_group_id: id, student_id: studentId });
    return { message: "تم حذف الطالب من المجموعة" };
  }
}

