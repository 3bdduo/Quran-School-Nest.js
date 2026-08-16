import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { MemorizationLog, Student, EduStudentRef } from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

// حد إنجاز الحفظ اللي بيستحق تهنئة أوتوماتيكية (كل ما وصل الطالب لعدد أجزاء صحيح)
const MILESTONE_KEYWORDS = ["جزء", "أجزاء"];

@Injectable()
export class MemorizationService {
  constructor(
    @InjectModel(MemorizationLog.name) private readonly logModel: Model<MemorizationLog>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async assertAccess(user: CurrentUserPayload, studentId: string) {
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");

    if (user.role === "teacher") {
      const isRegular = student.group_id === user.groupId;
      let isEdu = false;
      if (user.eduGroupId) {
        const ref = await this.eduStudentRefModel.findOne({ edu_group_id: user.eduGroupId, student_id: studentId }).lean();
        if (ref) isEdu = true;
      }
      if (!isRegular && !isEdu) throw new ForbiddenException("ليس لديك صلاحية");
    }
    return student;
  }

  async findByStudent(user: CurrentUserPayload, studentId: string) {
    await this.assertAccess(user, studentId);
    return this.logModel.find({ student_id: studentId }).sort({ date: -1 }).lean();
  }

  async create(user: CurrentUserPayload, studentId: string, body: any) {
    await this.assertAccess(user, studentId);

    const id = uuidv4();
    await this.logModel.create({
      id, student_id: studentId, date: body.date, added_amount: body.addedAmount,
      total_after: body.totalAfter, teacher_note: body.teacherNote || null,
    });
    await this.studentModel.updateOne({ id: studentId }, { memorized_amount: body.totalAfter });

    // أوتوميشن: نبعت للطالب تحديث حفظه أوتوماتيك كل ما يتسجل له تسميع جديد
    await this.notificationsService.notifyStudent(
      studentId,
      "تحديث في سجل الحفظ",
      `تم تسجيل تسميع جديد بتاريخ ${body.date}. إجمالي المحفوظ الآن: ${body.totalAfter}.`,
    );

    return this.logModel.findOne({ id }).lean();
  }

  async update(user: CurrentUserPayload, studentId: string, entryId: string, body: any) {
    await this.assertAccess(user, studentId);
    const update: any = {};
    if (body.addedAmount) update.added_amount = body.addedAmount;
    if (body.totalAfter) update.total_after = body.totalAfter;
    if (body.teacherNote !== undefined) update.teacher_note = body.teacherNote;
    if (body.date) update.date = body.date;
    if (Object.keys(update).length === 0) throw new NotFoundException("لا يوجد بيانات للتحديث");
    return this.logModel.findOneAndUpdate({ id: entryId }, update, { new: true }).lean();
  }

  async remove(user: CurrentUserPayload, studentId: string, entryId: string) {
    await this.assertAccess(user, studentId);
    await this.logModel.deleteOne({ id: entryId, student_id: studentId });
  }
}
