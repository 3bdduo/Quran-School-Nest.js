import {
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

  async findAll() {
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
      groups: groupsByTeacher[t.id] || [],
    }));
  }

  async findOne(id: string) {
    const teacher = await this.teacherModel.findOne({ id }).lean();
    if (!teacher) throw new NotFoundException("المعلم غير موجود");
    const groups = await this.groupModel.find({ teacher_id: id }).lean();
    return {
      id: teacher.id,
      full_name: teacher.full_name,
      national_id: teacher.national_id,
      phone: teacher.phone,
      username: teacher.username,
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
      });

      // إنشاء حلقة افتراضية للمعلم بمجرد إنشائه
      await this.groupModel.create({
        id: uuidv4(),
        name: `حلقة أ. ${dto.full_name.split(' ')[0]}`, // اسم افتراضي (حلقة أ. الاسم الأول)
        teacher_id: id,
      });

    } catch (err: any) {
      if (err.code === 11000) {
        const key = Object.keys(err.keyPattern || {})[0];
        if (key === "national_id") throw new ConflictException("الرقم القومي موجود بالفعل");
        throw new ConflictException("اسم المستخدم موجود بالفعل");
      }
      throw err;
    }

    return { id, full_name: dto.full_name, national_id: dto.national_id, username, phone: dto.phone };
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
