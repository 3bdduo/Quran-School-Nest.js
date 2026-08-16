import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { Settings, Group, EduGroup, Student } from "../../schemas";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(EduGroup.name) private readonly eduGroupModel: Model<EduGroup>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const { role, username, password } = dto;
    let user: any = null;
    let groupId: string | null = null;
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
      const teacher = await this.groupModel.findOne({ teacher_username: username }).lean();
      if (teacher) {
        if (!password) throw new BadRequestException("كلمة المرور مطلوبة");
        const valid = await bcrypt.compare(password, teacher.teacher_password);
        if (!valid) throw new UnauthorizedException("اسم المستخدم أو كلمة المرور غير صحيحة");
        groupId = teacher.id;
      }

      const eduTeacher = await this.eduGroupModel.findOne({ teacher_username: username }).lean();
      if (eduTeacher) {
        if (!groupId) {
          if (!password) throw new BadRequestException("كلمة المرور مطلوبة");
          const valid = await bcrypt.compare(password, eduTeacher.teacher_password);
          if (!valid) throw new UnauthorizedException("اسم المستخدم أو كلمة المرور غير صحيحة");
        }
        eduGroupId = eduTeacher.id;
      }

      if (!groupId && !eduGroupId) {
        throw new UnauthorizedException("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
      user = { role: "teacher", username };
    } else if (role === "student") {
      const student = await this.studentModel.findOne({ national_id: username }).lean();
      if (!student) throw new UnauthorizedException("الرقم القومي غير موجود");

      if (student.password && password) {
        const valid = await bcrypt.compare(password, student.password);
        if (!valid) throw new UnauthorizedException("كلمة المرور غير صحيحة");
      }

      user = { role: "student", username: student.national_id, studentId: student.id };
      groupId = student.group_id;
    } else {
      throw new BadRequestException("role غير صالح");
    }

    const payload = { ...user, groupId, eduGroupId };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: { role: user.role, username: user.username, groupId, eduGroupId },
    };
  }

  me(user: any) {
    const { role, username, groupId, eduGroupId, studentId } = user;
    return { role, username, groupId, eduGroupId, studentId };
  }
}
