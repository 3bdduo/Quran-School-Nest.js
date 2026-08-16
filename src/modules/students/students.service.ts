import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import {
  Student, Settings, PaymentRecord, AttendanceRecord, MemorizationLog,
  EduStudentRef, EduAttendanceRecord, ExamRecord, CompetitionParticipant, CompetitionResult,
} from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

const FIELD_MAP: Record<string, string> = {
  name: "name", phone: "phone", memorizedAmount: "memorized_amount", notes: "notes",
  groupId: "group_id", dateOfBirth: "date_of_birth", age: "age", nationalId: "national_id",
};

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(PaymentRecord.name) private readonly paymentModel: Model<PaymentRecord>,
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecord>,
    @InjectModel(MemorizationLog.name) private readonly memorizationModel: Model<MemorizationLog>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
    @InjectModel(EduAttendanceRecord.name) private readonly eduAttendanceModel: Model<EduAttendanceRecord>,
    @InjectModel(ExamRecord.name) private readonly examModel: Model<ExamRecord>,
    @InjectModel(CompetitionParticipant.name) private readonly competitionParticipantModel: Model<CompetitionParticipant>,
    @InjectModel(CompetitionResult.name) private readonly competitionResultModel: Model<CompetitionResult>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(user: CurrentUserPayload, groupIdQuery?: string) {
    const effectiveGroupId = user.role === "teacher" ? user.groupId : groupIdQuery;
    const filter = effectiveGroupId ? { group_id: effectiveGroupId } : {};
    return this.studentModel.find(filter).lean();
  }

  async findByNationalId(nationalId: string) {
    const student = await this.studentModel.findOne({ national_id: nationalId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");
    return student;
  }

  async findOne(id: string, user: CurrentUserPayload) {
    if (user.role === "student" && user.studentId !== id) throw new ForbiddenException("ليس لديك صلاحية");

    const student = await this.studentModel.findOne({ id }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");

    if (user.role === "teacher") {
      const isRegularGroup = student.group_id === user.groupId;
      let isEduGroup = false;
      if (user.eduGroupId) {
        const ref = await this.eduStudentRefModel.findOne({ edu_group_id: user.eduGroupId, student_id: id }).lean();
        if (ref) isEduGroup = true;
      }
      if (!isRegularGroup && !isEduGroup) throw new ForbiddenException("ليس لديك صلاحية");
    }

    const attendance = await this.attendanceModel.find({ student_id: id }, { date: 1, status: 1, _id: 0 }).sort({ date: -1 }).lean();
    const memorization = await this.memorizationModel.find({ student_id: id }).sort({ date: -1 }).lean();
    const payments = await this.paymentModel.find({ student_id: id }).lean();

    const paymentMap: any = {};
    payments.forEach((p) => {
      paymentMap[p.month_key] = { status: p.status, amount: p.amount, paidDate: p.paid_date, note: p.note };
    });

    return {
      ...student,
      attendanceRecords: attendance,
      memorizationLog: memorization,
      payment: { monthlyFee: student.monthly_fee, months: paymentMap },
    };
  }

  async create(user: CurrentUserPayload, body: any) {
    let groupId = body.groupId;
    if (user.role === "teacher") groupId = user.groupId;

    if (!groupId || !body.name || !body.nationalId || !body.dateOfBirth || !body.age) {
      throw new ConflictException("الحقول المطلوبة: groupId, name, nationalId, dateOfBirth, age");
    }

    const settings = await this.settingsModel.findById(1).lean();
    const monthlyFee = settings?.monthly_fee || 200;

    const id = uuidv4();
    const hashedPassword = body.password ? await bcrypt.hash(body.password, 10) : null;

    try {
      await this.studentModel.create({
        id, group_id: groupId, name: body.name, national_id: body.nationalId,
        date_of_birth: body.dateOfBirth, age: body.age, phone: body.phone || null,
        memorized_amount: body.memorizedAmount || "0", notes: body.notes || null,
        password: hashedPassword, monthly_fee: monthlyFee,
      });
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("الرقم القومي موجود بالفعل");
      throw err;
    }

    // أوتوميشن: بننشئ سجلات دفع الاشتراك الشهري لكل شهور السنة الحالية أوتوماتيك
    const currentYear = new Date().getFullYear();
    const paymentDocs = [];
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${currentYear}-${String(m).padStart(2, "0")}`;
      paymentDocs.push({ student_id: id, month_key: monthKey, status: "unpaid", amount: monthlyFee });
    }
    await this.paymentModel.insertMany(paymentDocs, { ordered: false }).catch(() => undefined);

    // أوتوميشن: نبلّغ حلقة الطالب (المدرس) بتسجيل طالب جديد أوتوماتيك
    await this.notificationsService.notifyGroup(groupId, "طالب جديد", `تم تسجيل الطالب "${body.name}" في الحلقة.`);

    return this.studentModel.findOne({ id }).lean();
  }

  async update(id: string, user: CurrentUserPayload, body: any) {
    const update: any = {};
    for (const [camel, snake] of Object.entries(FIELD_MAP)) {
      if (body[camel] !== undefined) update[snake] = body[camel];
    }

    if (user.role === "teacher") {
      const existing = await this.studentModel.findOne({ id }).lean();
      if (!existing || existing.group_id !== user.groupId) throw new ForbiddenException("ليس لديك صلاحية");
      delete update.group_id;
    }

    if (Object.keys(update).length === 0) throw new ConflictException("لا يوجد بيانات للتحديث");

    return this.studentModel.findOneAndUpdate({ id }, update, { new: true }).lean();
  }

  async remove(id: string) {
    await this.studentModel.deleteOne({ id });
    await this.attendanceModel.deleteMany({ student_id: id });
    await this.memorizationModel.deleteMany({ student_id: id });
    await this.paymentModel.deleteMany({ student_id: id });
    await this.eduStudentRefModel.deleteMany({ student_id: id });
    await this.eduAttendanceModel.deleteMany({ student_id: id });
    await this.examModel.deleteMany({ student_id: id });
    await this.competitionParticipantModel.deleteMany({ student_id: id });
    await this.competitionResultModel.deleteMany({ student_id: id });
  }

  async updateMonthlyFee(id: string, fee: number) {
    if (!fee) throw new ConflictException("fee مطلوب");
    return this.studentModel.findOneAndUpdate({ id }, { monthly_fee: fee }, { new: true }).lean();
  }
}
