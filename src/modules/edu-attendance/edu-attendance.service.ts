import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { EduAttendanceRecord } from "../../schemas";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class EduAttendanceService {
  constructor(@InjectModel(EduAttendanceRecord.name) private readonly model: Model<EduAttendanceRecord>) {}

  async record(user: CurrentUserPayload, eduGroupId: string, date: string, records: { studentId: string; status: string }[]) {
    if (user.role === "teacher" && user.eduGroupId !== eduGroupId) throw new ForbiddenException("ليس لديك صلاحية");
    for (const rec of records) {
      await this.model.findOneAndUpdate(
        { edu_group_id: eduGroupId, student_id: rec.studentId, date },
        { edu_group_id: eduGroupId, student_id: rec.studentId, date, status: rec.status },
        { upsert: true },
      );
    }
    return { message: "تم التسجيل" };
  }

  async find(user: CurrentUserPayload, eduGroupId: string, date?: string, studentId?: string) {
    if (user.role === "teacher" && user.eduGroupId !== eduGroupId) throw new ForbiddenException("ليس لديك صلاحية");
    const filter: any = { edu_group_id: eduGroupId };
    if (date) filter.date = date;
    if (studentId) filter.student_id = studentId;
    return this.model.find(filter, { student_id: 1, date: 1, status: 1, _id: 0 }).sort({ date: -1 }).lean();
  }
}
