import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Competition, CompetitionParticipant, CompetitionResult, Student, EduStudentRef } from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectModel(Competition.name) private readonly competitionModel: Model<Competition>,
    @InjectModel(CompetitionParticipant.name) private readonly participantModel: Model<CompetitionParticipant>,
    @InjectModel(CompetitionResult.name) private readonly resultModel: Model<CompetitionResult>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(EduStudentRef.name) private readonly eduStudentRefModel: Model<EduStudentRef>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll() {
    const competitions = await this.competitionModel.find().sort({ year: -1 }).lean();
    const counts = await this.participantModel.aggregate([{ $group: { _id: "$competition_id", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    return competitions.map((c) => ({
      id: c.id, name: c.name, description: c.description, year: c.year,
      participantsCount: countMap[c.id] || 0, resultsPublished: !!c.results_published,
    }));
  }

  async findOne(id: string) {
    const comp = await this.competitionModel.findOne({ id }).lean();
    if (!comp) throw new NotFoundException("المسابقة غير موجودة");

    const participants = await this.participantModel.find({ competition_id: id }).lean();
    const results = await this.resultModel.find({ competition_id: id }).sort({ rank_position: 1 }).lean();

    return {
      ...comp,
      participants: participants.map((p) => p.student_id),
      results: results.map((r) => ({ student_id: r.student_id, score: r.score, rank: r.rank_position, notes: r.notes })),
    };
  }

  async create(body: { name: string; description?: string; year: string }) {
    const id = uuidv4();
    await this.competitionModel.create({ id, name: body.name, description: body.description || null, year: body.year });
    return { id, name: body.name, description: body.description, year: body.year };
  }

  async update(id: string, body: { name?: string; description?: string; year?: string }) {
    const update: any = {};
    if (body.name) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.year) update.year = body.year;
    if (Object.keys(update).length === 0) throw new BadRequestException("لا يوجد بيانات");
    const comp = await this.competitionModel.findOneAndUpdate({ id }, update, { new: true }).lean();
    if (!comp) throw new NotFoundException("المسابقة غير موجودة");
    return comp;
  }

  async remove(id: string) {
    await this.competitionModel.deleteOne({ id });
    await this.participantModel.deleteMany({ competition_id: id });
    await this.resultModel.deleteMany({ competition_id: id });
  }

  private async assertTeacherOwnsStudent(user: CurrentUserPayload, studentId: string) {
    if (user.role !== "teacher") return;
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");
    const isRegular = student.group_id === user.groupId;
    let isEdu = false;
    if (user.eduGroupId) {
      const ref = await this.eduStudentRefModel.findOne({ edu_group_id: user.eduGroupId, student_id: studentId }).lean();
      if (ref) isEdu = true;
    }
    if (!isRegular && !isEdu) throw new ForbiddenException("ليس لديك صلاحية لإضافة هذا الطالب للمسابقة");
  }

  async addParticipant(user: CurrentUserPayload, competitionId: string, studentId: string) {
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");
    await this.assertTeacherOwnsStudent(user, studentId);

    await this.participantModel.findOneAndUpdate(
      { competition_id: competitionId, student_id: studentId },
      { competition_id: competitionId, student_id: studentId },
      { upsert: true },
    );
    return { message: "تم الإضافة" };
  }

  async removeParticipant(user: CurrentUserPayload, competitionId: string, studentId: string) {
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");
    await this.assertTeacherOwnsStudent(user, studentId);

    await this.participantModel.deleteOne({ competition_id: competitionId, student_id: studentId });
    // أوتوميشن: نمسح نتيجته لو كانت موجودة عشان النتائج تفضل متسقة مع المشاركين
    await this.resultModel.deleteOne({ competition_id: competitionId, student_id: studentId });
    return { message: "تم الحذف" };
  }

  // ============================================================================
  // إصلاحات المسابقات:
  // 1) النسخة القديمة كانت بتقبل أي student_id في النتائج حتى لو مش مسجل كمشارك
  //    أصلاً في المسابقة — دلوقتي بيترفض أي نتيجة لطالب مش مشارك.
  // 2) الترتيب (rank) كان لازم يتبعت يدوي من الفرونت إند وممكن يغلط — دلوقتي
  //    لو مبعتش rank بيتحسب أوتوماتيك من ترتيب الدرجات تنازليًا.
  // 3) بعد حفظ النتائج، بيتبعت إشعار أوتوماتيك لكل المشاركين، وتنويه خاص
  //    للفايزين بالمراكز التلاتة الأولى.
  // ============================================================================
  async saveResults(competitionId: string, results: { studentId: string; score: number; rank?: number; notes?: string }[]) {
    const comp = await this.competitionModel.findOne({ id: competitionId }).lean();
    if (!comp) throw new NotFoundException("المسابقة غير موجودة");
    if (!Array.isArray(results) || results.length === 0) throw new BadRequestException("النتائج مطلوبة");

    const participants = await this.participantModel.find({ competition_id: competitionId }).lean();
    const participantIds = new Set(participants.map((p) => p.student_id));
    const notParticipating = results.filter((r) => !participantIds.has(r.studentId));
    if (notParticipating.length) {
      throw new BadRequestException(
        `الطلاب التالية أرقامهم مش مسجلين كمشاركين في المسابقة: ${notParticipating.map((r) => r.studentId).join(", ")}`,
      );
    }

    // ترتيب تلقائي حسب الدرجة تنازليًا لو الترتيب مش متبعت
    const needsAutoRank = results.some((r) => r.rank === undefined || r.rank === null);
    let finalResults = results;
    if (needsAutoRank) {
      const sorted = [...results].sort((a, b) => b.score - a.score);
      finalResults = sorted.map((r, idx) => ({ ...r, rank: idx + 1 }));
    }

    await this.resultModel.deleteMany({ competition_id: competitionId });
    const docs = finalResults.map((r) => ({
      competition_id: competitionId, student_id: r.studentId, score: r.score, rank_position: r.rank, notes: r.notes || null,
    }));
    await this.resultModel.insertMany(docs);
    await this.competitionModel.updateOne({ id: competitionId }, { results_published: true });

    // أوتوميشن: إشعار عام لكل المشاركين + إشعار خاص للفايزين بالمراكز الأولى
    for (const r of finalResults) {
      const isWinner = r.rank <= 3;
      await this.notificationsService.notifyStudent(
        r.studentId,
        isWinner ? `🏆 تهانينا! حصلت على المركز ${r.rank}` : "تم نشر نتائج المسابقة",
        isWinner
          ? `مبروك! حصلت على المركز ${r.rank} في مسابقة "${comp.name}" بدرجة ${r.score}.`
          : `تم نشر نتائج مسابقة "${comp.name}". درجتك: ${r.score}، ترتيبك: ${r.rank}.`,
      );
    }

    return { message: "تم الحفظ", results: finalResults };
  }
}
