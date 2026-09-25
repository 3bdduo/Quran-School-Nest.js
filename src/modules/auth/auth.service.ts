import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { Settings, Teacher, Group, Student, EduGroup } from "../../schemas";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(Teacher.name) private readonly teacherModel: Model<Teacher>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(EduGroup.name) private readonly eduGroupModel: Model<EduGroup>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const { role, username, password } = dto;
    let user: any = null;
    let teacherId: string | null = null;
    let groupIds: string[] = [];
    let eduGroupId: string | null = null;

    if (role === "admin") {
      const settings = await this.settingsModel.findById(1).lean();
      if (!settings || username !== "Admin" || !settings.admin_password) {
        throw new UnauthorizedException("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
      if (!password) throw new BadRequestException("كلمة المرور مطلوبة");
      const valid = await bcrypt.compare(password, settings.admin_password);
      if (!valid) throw new UnauthorizedException("اسم المستخدم أو كلمة المرور غير صحيحة");
      user = { role: "admin", username: "Admin" };

    } else if (role === "teacher") {
      // تسجيل دخول المعلم: نبحث في Teacher entity
      let teacher = await this.teacherModel.findOne({ username }).lean();
      if (!password) throw new BadRequestException("كلمة المرور مطلوبة");

      if (teacher) {
        const valid = await bcrypt.compare(password, teacher.password);
        if (!valid) throw new UnauthorizedException("اسم المستخدم أو كلمة المرور غير صحيحة");

        teacherId = teacher.id;

        // جلب حلقات المعلم إن وجدت
        let teacherGroups = await this.groupModel.find({ teacher_id: teacherId }).lean();
        if (teacher.teacher_type === "group" && teacherGroups.length === 0) {
          const firstName = (teacher.full_name || "").trim().split(/\s+/)[0] || "المعلم";
          try {
            await this.groupModel.collection.dropIndex("teacher_username_1");
          } catch {}
          try {
            const newG = await this.groupModel.create({
              id: uuidv4(),
              name: `حلقة أ. ${firstName}`,
              teacher_id: teacherId,
              teacher_username: teacher.username || `teacher_${teacherId.slice(0, 8)}`,
              teacher_password: "",
            });
            teacherGroups = [newG as any];
          } catch {
            const newG = await this.groupModel.create({
              id: uuidv4(),
              name: `حلقة أ. ${firstName} (${teacher.username})`,
              teacher_id: teacherId,
              teacher_username: `${teacher.username}_${uuidv4().slice(0, 4)}`,
              teacher_password: "",
            }).catch(() => null);
            if (newG) teacherGroups = [newG as any];
          }
        }
        groupIds = teacherGroups.map((g) => g.id);

        // جلب مجموعة التربوي المرتبطة بهذا المعلم إن وجدت
        const eduGroup = await this.eduGroupModel.findOne({
          $or: [{ teacher_username: teacher.username }, { teacher_id: teacher.id }],
        }).lean();
        if (eduGroup) eduGroupId = eduGroup.id;

        user = { role: "teacher", username: teacher.username, teacherId, eduGroupId };
      } else {
        // فحص ما إذا كان معلماً تربوياً مسجلاً في جدول EduGroup مباشرة
        const eduGroup = await this.eduGroupModel.findOne({ teacher_username: username }).lean();
        if (!eduGroup) throw new UnauthorizedException("اسم المستخدم أو كلمة المرور غير صحيحة");

        const valid = await bcrypt.compare(password, eduGroup.teacher_password);
        if (!valid) throw new UnauthorizedException("اسم المستخدم أو كلمة المرور غير صحيحة");

        eduGroupId = eduGroup.id;
        user = { role: "teacher", username: eduGroup.teacher_username, teacherId: eduGroup.teacher_id || null, eduGroupId };
      }

    } else if (role === "student") {
      const student = await this.studentModel.findOne({ national_id: username }).lean();
      if (!student) throw new UnauthorizedException("الرقم القومي غير موجود");
      user = { role: "student", username: student.national_id, studentId: student.id };
    } else {
      throw new BadRequestException("role غير صالح");
    }

    const payload = {
      ...user,
      groupIds: groupIds.length ? groupIds : undefined,
      eduGroupId: eduGroupId || undefined,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        role: user.role,
        username: user.username,
        teacherId: user.teacherId || null,
        groupIds: groupIds.length ? groupIds : undefined,
        eduGroupId: eduGroupId || null,
        studentId: user.studentId || null,
      },
    };
  }

  me(user: any) {
    const { role, username, teacherId, groupIds, eduGroupId, studentId } = user;
    return { role, username, teacherId, groupIds, eduGroupId: eduGroupId || null, studentId };
  }
}

