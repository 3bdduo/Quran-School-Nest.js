import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PaymentRecord, Student } from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentRecord.name) private readonly paymentModel: Model<PaymentRecord>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async byStudent(user: CurrentUserPayload, studentId: string) {
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");
    if (user.role === "teacher" && student.group_id !== user.groupId) throw new ForbiddenException("ليس لديك صلاحية");

    const records = await this.paymentModel.find({ student_id: studentId }).lean();
    const months: any = {};
    records.forEach((r) => {
      months[r.month_key] = { status: r.status, amount: r.amount, paidDate: r.paid_date, note: r.note };
    });
    return { monthlyFee: student.monthly_fee, months };
  }

  async updateMonth(studentId: string, monthKey: string, body: any) {
    const record = await this.paymentModel.findOneAndUpdate(
      { student_id: studentId, month_key: monthKey },
      { student_id: studentId, month_key: monthKey, status: body.status, amount: body.amount, paid_date: body.paidDate || null, note: body.note || null },
      { upsert: true, new: true },
    ).lean();

    // أوتوميشن: لو الحالة اتسجلت "مدفوع"، نبعت للطالب إشعار إيصال أوتوماتيك
    if (body.status === "paid") {
      const student = await this.studentModel.findOne({ id: studentId }).lean();
      if (student) {
        await this.notificationsService.notifyStudent(
          studentId,
          "تم استلام الاشتراك",
          `تم تسجيل دفع اشتراك شهر ${monthKey} بمبلغ ${body.amount ?? student.monthly_fee} جنيه. شكرًا لالتزامكم.`,
        );
      }
    }

    return record;
  }

  async summary(monthKey: string) {
    const records = await this.paymentModel.find({ month_key: monthKey }).lean();
    const paid = records.filter((r) => r.status === "paid").length;
    const unpaid = records.filter((r) => r.status === "unpaid").length;
    const exempt = records.filter((r) => r.status === "exempt").length;
    const totalAmount = records.filter((r) => r.status === "paid").reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    return { paid, unpaid, exempt, total: records.length, totalAmount };
  }

  async byGroup(user: CurrentUserPayload, groupId: string, monthKey: string) {
    if (user.role === "teacher" && user.groupId !== groupId) throw new ForbiddenException("ليس لديك صلاحية");
    const students = await this.studentModel.find({ group_id: groupId }).lean();
    const studentIds = students.map((s) => s.id);
    const payments = await this.paymentModel.find({ student_id: { $in: studentIds }, month_key: monthKey }).lean();
    const paymentMap = Object.fromEntries(payments.map((p) => [p.student_id, p]));

    return students.map((s) => ({
      student_id: s.id, student_name: s.name,
      status: (paymentMap[s.id] as any)?.status || "unpaid",
      amount: (paymentMap[s.id] as any)?.amount,
      paid_date: (paymentMap[s.id] as any)?.paid_date,
    }));
  }
}
