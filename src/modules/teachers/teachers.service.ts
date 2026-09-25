import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { Teacher, Group } from "../../schemas";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";

// ============================================================
// خوارزمية توليد اسم المستخدم الإنجليزي من الاسم العربي
// ============================================================
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
  // إزالة الأحرف غير الأبجدية ماعدا النقطة
  return result.replace(/[^a-z0-9.]/gi, "").toLowerCase();
}

function generateUsername(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  // نأخذ أول حرف من الاسم الأول + اسم الثاني كاملاً
  const first = transliterate(parts[0]?.charAt(0) || "t");
  const second = transliterate(parts[1] || parts[0] || "teacher");
  return `${first}.${second}`.slice(0, 20); // حد أقصى 20 حرف
}

@Injectable()
export class TeachersService {
  constructor(
    @InjectModel(Teacher.name) private readonly teacherModel: Model<Teacher>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
  ) {}

  // دالة أوتوماتيكية تضمن إزالة الفهارس القديمة وإنشاء حلقة لأي معلم نوعه "معلم حلقة" معندوش حلقة
  async ensureGroupsForGroupTeachers() {
    try {
      await this.groupModel.collection.dropIndex("teacher_username_1");
    } catch {}

    const groupTeachers = await this.teacherModel.find({ teacher_type: "group" }).lean();
    for (const t of groupTeachers) {
      const existing = await this.groupModel.findOne({ teacher_id: t.id }).lean();
      if (!existing) {
        const firstName = (t.full_name || "").trim().split(/\s+/)[0] || "المعلم";
        try {
          await this.groupModel.create({
            id: uuidv4(),
            name: `حلقة أ. ${firstName}`,
            teacher_id: t.id,
            teacher_username: t.username || `teacher_${t.id.slice(0, 8)}`,
            teacher_password: "",
          });
        } catch {
          // لو الاسم مكرر، ننشئها باسم مميز مع اسم المستخدم
          await this.groupModel.create({
            id: uuidv4(),
            name: `حلقة أ. ${firstName} (${t.username})`,
            teacher_id: t.id,
            teacher_username: `${t.username}_${uuidv4().slice(0, 4)}`,
            teacher_password: "",
          }).catch(() => undefined);
        }
      }
    }
  }

  async findAll() {
    await this.ensureGroupsForGroupTeachers().catch(() => undefined);

    const teachers = await this.teacherModel.find().sort({ full_name: 1 }).lean();
    // إضافة حلقات كل معلم
    const teacherIds = teachers.map((t) => t.id);
    const groups = await this.groupModel.find({ teacher_id: { $in: teacherIds } }).lean();
    const groupsByTeacher: Record<string, any[]> = {};
    groups.forEach((g) => {
      if (!groupsByTeacher[g.teacher_id!]) groupsByTeacher[g.teacher_id!] = [];
      groupsByTeacher[g.teacher_id!].push({ id: g.id, name: g.name });
    });
    return teachers.map((t) => ({
      id: t.id,
      full_name: t.full_name,
      national_id: t.national_id,
      phone: t.phone,
      username: t.username,
      teacher_type: t.teacher_type ?? null,
      groups: groupsByTeacher[t.id] || [],
    }));
  }

  async findOne(id: string) {
    const teacher = await this.teacherModel.findOne({ id }).lean();
    if (!teacher) throw new NotFoundException("المعلم غير موجود");
    let groups = await this.groupModel.find({ teacher_id: id }).lean();
    if (teacher.teacher_type === "group" && groups.length === 0) {
      await this.ensureGroupsForGroupTeachers().catch(() => undefined);
      groups = await this.groupModel.find({ teacher_id: id }).lean();
    }
    return {
      id: teacher.id,
      full_name: teacher.full_name,
      national_id: teacher.national_id,
      phone: teacher.phone,
      username: teacher.username,
      teacher_type: teacher.teacher_type ?? null,
      groups: groups.map((g) => ({ id: g.id, name: g.name })),
    };
  }

  async findByUsername(username: string) {
    const teacher = await this.teacherModel.findOne({ username }).lean();
    if (!teacher) throw new NotFoundException("المعلم غير موجود");
    return teacher;
  }

  async create(dto: CreateTeacherDto) {
    // توليد username فريد
    let baseUsername = generateUsername(dto.full_name);
    let username = baseUsername;
    let counter = 1;
    while (await this.teacherModel.findOne({ username }).lean()) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      await this.teacherModel.create({
        id,
        full_name: dto.full_name,
        national_id: dto.national_id,
        phone: dto.phone || null,
        username,
        password: hashedPassword,
        teacher_type: null, // الأدمن بيحدد النوع بعد الإنشاء مباشرة (حلقة / غير حلقة)
      });
      // ملحوظة: مفيش حلقة بتتعمل تلقائي هنا دلوقتي — بتتعمل فقط لو الأدمن اختار النوع "group"
    } catch (err: any) {
      if (err.code === 11000) {
        const key = Object.keys(err.keyPattern || {})[0];
        if (key === "national_id") throw new ConflictException("الرقم القومي موجود بالفعل");
        throw new ConflictException("اسم المستخدم موجود بالفعل");
      }
      throw err;
    }

    return { id, full_name: dto.full_name, national_id: dto.national_id, username, phone: dto.phone, teacher_type: null };
  }

  // بيتنادى بعد إنشاء المعلم مباشرة — الأدمن بيحدد هل المعلم ده "معلم حلقة" (بيقدر يكون عنده طلاب)
  // أو "معلم عادي" (مينفعش يتضافله طلاب مباشرة). ممكن يتغيّر لاحقًا لأي نوع من الاتنين.
  async setType(id: string, type: "group" | "other") {
    if (type !== "group" && type !== "other") {
      throw new BadRequestException("نوع المعلم غير صحيح — يجب أن يكون 'group' أو 'other'");
    }
    const teacher = await this.teacherModel.findOne({ id }).lean();
    if (!teacher) throw new NotFoundException("المعلم غير موجود");

    try {
      await this.groupModel.collection.dropIndex("teacher_username_1");
    } catch {}

    await this.teacherModel.updateOne({ id }, { teacher_type: type });

    // لو اتحول لـ "معلم حلقة" ومفيش حلقة ليه أصلاً — نعمله حلقة افتراضية عشان يقدر يستقبل طلاب فورًا
    if (type === "group") {
      const existingGroup = await this.groupModel.findOne({ teacher_id: id }).lean();
      if (!existingGroup) {
        const firstName = (teacher.full_name || "").trim().split(/\s+/)[0] || "المعلم";
        try {
          await this.groupModel.create({
            id: uuidv4(),
            name: `حلقة أ. ${firstName}`,
            teacher_id: id,
            teacher_username: teacher.username || `teacher_${id.slice(0, 8)}`,
            teacher_password: "",
          });
        } catch {
          await this.groupModel.create({
            id: uuidv4(),
            name: `حلقة أ. ${firstName} (${teacher.username})`,
            teacher_id: id,
            teacher_username: `${teacher.username}_${uuidv4().slice(0, 4)}`,
            teacher_password: "",
          }).catch(() => undefined);
        }
      }
    }

    return {
      id,
      teacher_type: type,
      message: type === "group" ? "تم تحديد المعلم كمعلم حلقة" : "تم تحديد المعلم كمعلم عادي (بدون طلاب)",
    };
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.teacherModel.findOne({ id }).lean();
    if (!teacher) throw new NotFoundException("المعلم غير موجود");

    const update: any = {};
    if (dto.full_name) update.full_name = dto.full_name;
    if (dto.national_id) update.national_id = dto.national_id;
    if (dto.phone !== undefined) update.phone = dto.phone;
    if (dto.password) update.password = await bcrypt.hash(dto.password, 10);

    if (Object.keys(update).length === 0) throw new ConflictException("لا يوجد بيانات للتحديث");

    try {
      const updated = await this.teacherModel.findOneAndUpdate({ id }, update, { new: true }).lean();
      return { id: updated!.id, full_name: updated!.full_name, national_id: updated!.national_id, username: updated!.username, phone: updated!.phone };
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("الرقم القومي موجود بالفعل");
      throw err;
    }
  }

  async remove(id: string) {
    const teacher = await this.teacherModel.findOne({ id }).lean();
    if (!teacher) throw new NotFoundException("المعلم غير موجود");
    // إلغاء ربط المعلم بأي حلقة
    await this.groupModel.updateMany({ teacher_id: id }, { teacher_id: null });
    await this.teacherModel.deleteOne({ id });
    return { message: "تم حذف المعلم بنجاح" };
  }

  async assignToGroup(teacherId: string, groupId: string) {
    const teacher = await this.teacherModel.findOne({ id: teacherId }).lean();
    if (!teacher) throw new NotFoundException("المعلم غير موجود");
    if (teacher.teacher_type !== "group") {
      throw new BadRequestException("المعلم ده مش معلم حلقة، لازم تحدد نوعه كـ \"معلم حلقة\" الأول");
    }
    const group = await this.groupModel.findOne({ id: groupId }).lean();
    if (!group) throw new NotFoundException("الحلقة غير موجودة");
    await this.groupModel.findOneAndUpdate({ id: groupId }, { teacher_id: teacherId });
    return { message: "تم ربط المعلم بالحلقة بنجاح" };
  }

  async removeFromGroup(teacherId: string, groupId: string) {
    await this.groupModel.findOneAndUpdate({ id: groupId, teacher_id: teacherId }, { teacher_id: null });
    return { message: "تم إلغاء ربط المعلم من الحلقة" };
  }
}
