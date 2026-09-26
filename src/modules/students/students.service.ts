import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import {
  Student, Settings, PaymentRecord, AttendanceRecord, MemorizationLog,
  EduStudentRef, EduAttendanceRecord, ExamRecord, CompetitionParticipant, CompetitionResult,
} from "../../schemas";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { validateFullName, validateEgyptianNationalId, validateEgyptianPhone } from "../../common/validation.utils";

const FIELD_MAP: Record<string, string> = {
  name: "name", phone: "phone", memorizedAmount: "memorized_amount", notes: "notes",
  groupId: "group_id", dateOfBirth: "date_of_birth", age: "age", nationalId: "national_id",
  currentSurah: "current_surah", parentName: "parent_name",
};

// ============================================================
// خوارزمية استخراج تاريخ الميلاد والسن من الرقم القومي المصري
// ============================================================
function extractDataFromNationalId(nationalId: string) {
  if (!nationalId || nationalId.length !== 14) return { dateOfBirth: "غير محدد", age: 0 };
  
  const centuryCode = nationalId.charAt(0);
  const yearStr = nationalId.substring(1, 3);
  const monthStr = nationalId.substring(3, 5);
  const dayStr = nationalId.substring(5, 7);
  
  // 2 = 1900s, 3 = 2000s
  const century = centuryCode === "2" ? 1900 : centuryCode === "3" ? 2000 : 1900;
  const year = century + parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return { dateOfBirth: "غير محدد", age: 0 };
  
  const dateOfBirth = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  
  const today = new Date();
  const dob = new Date(year, month - 1, day);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return { dateOfBirth, age: Math.max(0, age) };
}

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

  ) {}

  async findAll(user: CurrentUserPayload, groupIdQuery?: string) {
    if (user.role === "teacher") {
      if (user.teacherType === "edu" || (user.eduGroupId && (!user.groupIds || user.groupIds.length === 0))) {
        // معلم تربوي: يطلب الطلاب النشطين لاختيارهم للمجموعة التربوية
        const filter: any = { is_waiting: { $ne: true } };
        if (groupIdQuery) filter.group_id = groupIdQuery;
        return this.studentModel.find(filter).lean();
      }

      // معلم حلقة: يرى فقط طلاب حلقاته القرآنية المسندة إليه
      const groupIds = user.groupIds || [];
      const filter: any = { group_id: { $in: groupIds } };
      if (groupIdQuery && groupIds.includes(groupIdQuery)) {
        filter.group_id = groupIdQuery;
      }
      return this.studentModel.find(filter).lean();
    }
    const filter = groupIdQuery ? { group_id: groupIdQuery } : {};
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
      const groupIds = user.groupIds || [];
      const isRegularGroup = groupIds.includes(student.group_id);
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
    if (user.role === "teacher") {
      const groupIds = user.groupIds || [];
      if (!groupIds.includes(groupId)) {
        if (groupIds.length === 1 && !groupId) {
          groupId = groupIds[0];
        } else {
          throw new ForbiddenException("يرجى تحديد الحلقة الصحيحة للطالب");
        }
      }
    }

    // ─── التحقق من صحة البيانات ──────────────────────────
    const nameCheck = validateFullName(body.name);
    if (!nameCheck.valid) throw new ConflictException(nameCheck.message);

    const nidCheck = validateEgyptianNationalId(body.nationalId);
    if (!nidCheck.valid) throw new ConflictException(nidCheck.message);

    if (body.phone) {
      const phoneCheck = validateEgyptianPhone(body.phone);
      if (!phoneCheck.valid) throw new ConflictException(phoneCheck.message);
    }
    if (!groupId && user.role !== "admin" && !body.isWaiting) {
      throw new ConflictException("الحقل المطلوب: groupId");
    }

    const settings = await this.settingsModel.findById(1).lean();
    const monthlyFee = settings?.monthly_fee || 200;

    const id = uuidv4();
    const hashedPassword = body.password ? await bcrypt.hash(body.password, 10) : null;

    const { dateOfBirth, age } = extractDataFromNationalId(body.nationalId);

    try {
      await this.studentModel.create({
        id, group_id: groupId || "waiting", name: body.name, national_id: body.nationalId,
        parent_name: body.parentName || null,
        date_of_birth: dateOfBirth, age, phone: body.phone || null,
        memorized_amount: body.memorizedAmount || "0", 
        current_surah: body.currentSurah || "غير محدد",
        notes: body.notes || null,
        password: hashedPassword, monthly_fee: monthlyFee,
        is_waiting: !!body.isWaiting,
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

    return this.studentModel.findOne({ id }).lean();
  }

  // تسجيل ذاتي من الموقع (يذهب لقائمة الانتظار)
  async publicRegister(body: {
    name: string; phone: string; nationalId: string; memorizedAmount: string; currentSurah: string;
  }) {
    // ─── التحقق من صحة البيانات ──────────────────────────
    const nameCheck = validateFullName(body.name);
    if (!nameCheck.valid) throw new ConflictException(nameCheck.message);

    const nidCheck = validateEgyptianNationalId(body.nationalId);
    if (!nidCheck.valid) throw new ConflictException(nidCheck.message);

    const phoneCheck = validateEgyptianPhone(body.phone);
    if (!phoneCheck.valid) throw new ConflictException(phoneCheck.message);

    if (!body.memorizedAmount || !body.currentSurah) {
      throw new ConflictException("كمية الحفظ والسورة الحالية مطلوبة");
    }

    const settings = await this.settingsModel.findById(1).lean();
    const monthlyFee = settings?.monthly_fee || 200;

    const id = uuidv4();
    const { dateOfBirth, age } = extractDataFromNationalId(body.nationalId);

    try {
      await this.studentModel.create({
        id, group_id: "waiting", name: body.name,
        national_id: body.nationalId,
        date_of_birth: dateOfBirth, age: age || 0,
        phone: body.phone,
        memorized_amount: body.memorizedAmount, current_surah: body.currentSurah,
        monthly_fee: monthlyFee, is_waiting: true,
      });
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("الرقم القومي موجود بالفعل");
      throw err;
    }

    return { message: "تم استلام طلب التسجيل بنجاح", studentId: id };
  }

  // نقل طالب من الانتظار لمجموعة
  async moveFromWaiting(studentId: string, groupId: string) {
    if (!groupId) throw new ConflictException("groupId مطلوب");
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");

    await this.studentModel.findOneAndUpdate(
      { id: studentId },
      { group_id: groupId, is_waiting: false },
      { new: true }
    );

    return this.studentModel.findOne({ id: studentId }).lean();
  }

  async findWaiting() {
    return this.studentModel.find({ is_waiting: true }).sort({ created_at: -1 }).lean();
  }

  async update(id: string, user: CurrentUserPayload, body: any) {
    const update: any = {};
    for (const [camel, snake] of Object.entries(FIELD_MAP)) {
      if (body[camel] !== undefined) update[snake] = body[camel];
    }
    
    // إعادة الحساب لو اتغير الرقم القومي
    if (body.nationalId) {
      const { dateOfBirth, age } = extractDataFromNationalId(body.nationalId);
      update.date_of_birth = dateOfBirth;
      update.age = age;
    }

    if (user.role === "teacher") {
      const groupIds = user.groupIds || [];
      const existing = await this.studentModel.findOne({ id }).lean();
      if (!existing || !groupIds.includes(existing.group_id)) throw new ForbiddenException("ليس لديك صلاحية");
      delete update.group_id; // المدرس لا يغير مجموعة الطالب
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
