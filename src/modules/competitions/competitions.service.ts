import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import {
  Competition,
  CompetitionParticipant,
  CompetitionResult,
  Student,
  EduStudentRef,
} from "../../schemas";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectModel(Competition.name)
    private readonly competitionModel: Model<Competition>,
    @InjectModel(CompetitionParticipant.name)
    private readonly participantModel: Model<CompetitionParticipant>,
    @InjectModel(CompetitionResult.name)
    private readonly resultModel: Model<CompetitionResult>,
    @InjectModel(Student.name)
    private readonly studentModel: Model<Student>,
    @InjectModel(EduStudentRef.name)
    private readonly eduStudentRefModel: Model<EduStudentRef>,
  ) {}

  // ── قائمة المسابقات ──────────────────────────────────────────────────────
  async findAll(type?: "external" | "internal") {
    const filter: any = {};
    if (type) filter.competition_type = type;
    const competitions = await this.competitionModel
      .find(filter)
      .sort({ year: -1 })
      .lean();
    const counts = await this.participantModel.aggregate([
      { $group: { _id: "$competition_id", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    return competitions.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      year: c.year,
      competition_type: c.competition_type || "external",
      max_score: c.max_score ?? 100,
      participantsCount: countMap[c.id] || 0,
      resultsPublished: !!c.results_published,
    }));
  }

  // ── تفاصيل مسابقة واحدة ─────────────────────────────────────────────────
  async findOne(id: string) {
    const comp = await this.competitionModel.findOne({ id }).lean();
    if (!comp) throw new NotFoundException("المسابقة غير موجودة");

    const participants = await this.participantModel
      .find({ competition_id: id })
      .lean();
    const results = await this.resultModel
      .find({ competition_id: id })
      .sort({ rank_position: 1 })
      .lean();

    return {
      ...comp,
      competition_type: comp.competition_type || "external",
      max_score: comp.max_score ?? 100,
      participants: participants.map((p) => p.student_id),
      results: results.map((r) => ({
        student_id: r.student_id,
        score: r.score,
        rank: r.rank_position,
        notes: r.notes,
      })),
    };
  }

  // ── إنشاء مسابقة ────────────────────────────────────────────────────────
  async create(body: {
    name: string;
    description?: string;
    year: string;
    competition_type?: "external" | "internal";
    max_score?: number;
  }) {
    const id = uuidv4();
    await this.competitionModel.create({
      id,
      name: body.name,
      description: body.description || null,
      year: body.year,
      competition_type: body.competition_type || "external",
      max_score: body.max_score ?? 100,
    });
    return {
      id,
      name: body.name,
      description: body.description,
      year: body.year,
      competition_type: body.competition_type || "external",
      max_score: body.max_score ?? 100,
    };
  }

  // ── تعديل مسابقة ────────────────────────────────────────────────────────
  async update(
    id: string,
    body: {
      name?: string;
      description?: string;
      year?: string;
      competition_type?: "external" | "internal";
      max_score?: number;
    },
  ) {
    const update: any = {};
    if (body.name) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.year) update.year = body.year;
    if (body.competition_type) update.competition_type = body.competition_type;
    if (body.max_score !== undefined) update.max_score = body.max_score;
    if (Object.keys(update).length === 0)
      throw new BadRequestException("لا يوجد بيانات");
    const comp = await this.competitionModel
      .findOneAndUpdate({ id }, update, { new: true })
      .lean();
    if (!comp) throw new NotFoundException("المسابقة غير موجودة");
    return comp;
  }

  // ── حذف مسابقة ──────────────────────────────────────────────────────────
  async remove(id: string) {
    await this.competitionModel.deleteOne({ id });
    await this.participantModel.deleteMany({ competition_id: id });
    await this.resultModel.deleteMany({ competition_id: id });
  }

  // ── صلاحية المعلم ────────────────────────────────────────────────────────
  private async assertTeacherOwnsStudent(
    user: CurrentUserPayload,
    studentId: string,
  ) {
    if (user.role !== "teacher") return;
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");
    const groupIds = (user as any).groupIds || [];
    const isRegular = groupIds.includes(student.group_id);
    let isEdu = false;
    if (user.eduGroupId) {
      const ref = await this.eduStudentRefModel
        .findOne({ edu_group_id: user.eduGroupId, student_id: studentId })
        .lean();
      if (ref) isEdu = true;
    }
    if (!isRegular && !isEdu)
      throw new ForbiddenException(
        "ليس لديك صلاحية لإضافة هذا الطالب للمسابقة",
      );
  }

  // ── إضافة مشارك واحد ─────────────────────────────────────────────────────
  async addParticipant(
    user: CurrentUserPayload,
    competitionId: string,
    studentId: string,
  ) {
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

  // ── إضافة مشاركين بالجملة ────────────────────────────────────────────────
  // mode: "all" → كل الطلاب | "group" → طلاب مجموعة معينة | "letter" → اسمهم يبدأ بحرف | "ids" → قائمة
  async bulkAddParticipants(
    competitionId: string,
    body: {
      mode: "all" | "group" | "letter" | "ids";
      groupId?: string;
      letter?: string;
      studentIds?: string[];
    },
  ) {
    const comp = await this.competitionModel
      .findOne({ id: competitionId })
      .lean();
    if (!comp) throw new NotFoundException("المسابقة غير موجودة");

    let students: any[] = [];

    if (body.mode === "all") {
      students = await this.studentModel
        .find({ is_waiting: false })
        .lean();
    } else if (body.mode === "group") {
      if (!body.groupId)
        throw new BadRequestException("المجموعة / الحلقة مطلوبة");
      students = await this.studentModel
        .find({ group_id: body.groupId, is_waiting: false })
        .lean();
    } else if (body.mode === "letter") {
      if (!body.letter)
        throw new BadRequestException("الحرف مطلوب عند اختيار وضع الحرف");
      const rawLetter = body.letter.trim();
      let pattern = `^${rawLetter}`;
      if (["ا", "أ", "إ", "آ"].includes(rawLetter)) {
        pattern = "^[اأإآ]";
      }
      students = await this.studentModel
        .find({ name: new RegExp(pattern, "i"), is_waiting: false })
        .lean();
    } else if (body.mode === "ids") {
      if (!body.studentIds?.length)
        throw new BadRequestException("قائمة الطلاب مطلوبة");
      students = await this.studentModel
        .find({ id: { $in: body.studentIds }, is_waiting: false })
        .lean();
    }

    if (!students.length)
      return { message: "لم يتم إيجاد طلاب مطابقين", added: 0 };

    const existing = await this.participantModel
      .find({ competition_id: competitionId })
      .lean();
    const existingIds = new Set(existing.map((p) => p.student_id));

    const newDocs = students
      .filter((s) => !existingIds.has(s.id))
      .map((s) => ({ competition_id: competitionId, student_id: s.id }));

    if (!newDocs.length)
      return { message: "كل الطلاب مضافون بالفعل للمسابقة", added: 0 };

    await this.participantModel.insertMany(newDocs, { ordered: false });
    return { message: "تمت الإضافة بنجاح", added: newDocs.length };
  }

  // ── حذف مشارك ─────────────────────────────────────────────────────────────
  async removeParticipant(
    user: CurrentUserPayload,
    competitionId: string,
    studentId: string,
  ) {
    const student = await this.studentModel.findOne({ id: studentId }).lean();
    if (!student) throw new NotFoundException("الطالب غير موجود");
    await this.assertTeacherOwnsStudent(user, studentId);

    await this.participantModel.deleteOne({
      competition_id: competitionId,
      student_id: studentId,
    });
    await this.resultModel.deleteOne({
      competition_id: competitionId,
      student_id: studentId,
    });
    return { message: "تم الحذف" };
  }

  // ── رصد النتائج ───────────────────────────────────────────────────────────
  async saveResults(
    competitionId: string,
    results: {
      studentId: string;
      score: number;
      rank?: number;
      notes?: string;
    }[],
  ) {
    const comp = await this.competitionModel
      .findOne({ id: competitionId })
      .lean();
    if (!comp) throw new NotFoundException("المسابقة غير موجودة");
    if (!Array.isArray(results) || results.length === 0)
      throw new BadRequestException("النتائج مطلوبة");

    const participants = await this.participantModel
      .find({ competition_id: competitionId })
      .lean();
    const participantIds = new Set(participants.map((p) => p.student_id));
    const notParticipating = results.filter(
      (r) => !participantIds.has(r.studentId),
    );
    if (notParticipating.length) {
      throw new BadRequestException(
        `هؤلاء الطلاب غير مسجلين كمشاركين: ${notParticipating.map((r) => r.studentId).join(", ")}`,
      );
    }

    // ترتيب تلقائي تنازلي حسب الدرجة
    const sorted = [...results].sort((a, b) => b.score - a.score);
    const finalResults = sorted.map((r, idx) => ({ ...r, rank: idx + 1 }));

    await this.resultModel.deleteMany({ competition_id: competitionId });
    const docs = finalResults.map((r) => ({
      competition_id: competitionId,
      student_id: r.studentId,
      score: r.score,
      rank_position: r.rank,
      notes: r.notes || null,
    }));
    await this.resultModel.insertMany(docs);
    await this.competitionModel.updateOne(
      { id: competitionId },
      { results_published: true },
    );

    return { message: "تم الحفظ", results: finalResults };
  }

  // ── نتيجة طالب بالرقم القومي (للويب سايت وشاشة التهنئة) ─────────────────
  async getResultByNationalId(nationalId: string) {
    if (!nationalId || !nationalId.trim()) {
      throw new BadRequestException("الرقم القومي مطلوب");
    }
    // ابحث عن الطالب بالرقم القومي
    const student = await this.studentModel
      .findOne({ national_id: nationalId.trim() })
      .lean();
    if (!student)
      throw new NotFoundException("لا يوجد طالب مسجل بهذا الرقم القومي");

    // اجلب جميع النتائج المرصودة للطالب في المسابقات والاختبارات المنشورة
    const results = await this.resultModel
      .find({ student_id: student.id })
      .sort({ created_at: -1 })
      .lean();

    if (!results.length) {
      return {
        hasResult: false,
        student: {
          id: student.id,
          name: student.name,
          national_id: student.national_id,
        },
        results: [],
      };
    }

    const competitionIds = results.map((r) => r.competition_id);
    const competitions = await this.competitionModel
      .find({ id: { $in: competitionIds }, results_published: true })
      .lean();

    const compMap = new Map(competitions.map((c) => [c.id, c]));

    const enrichedResults = results
      .filter((r) => compMap.has(r.competition_id))
      .map((r) => {
        const comp = compMap.get(r.competition_id)!;
        const maxScore = comp.max_score ?? 100;
        const percentage = Math.round((r.score / maxScore) * 100);

        let celebrationLevel: "gold" | "silver" | "bronze" | "pass" | "good";
        let title: string;
        let message: string;
        let ayah: string;

        if (r.rank_position === 1 || percentage >= 95) {
          celebrationLevel = "gold";
          title = "الوسام الذهبي الملكي 🏆 تاج الوقار";
          message =
            "مبارك الفوز الباهر والتميز الاستثنائي! رفعت رأس والديك ومعلميك، نسأل الله أن يجعلك من أهل القرآن الذين هم أهل الله وخاصته.";
          ayah = "وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ";
        } else if (
          r.rank_position === 2 ||
          r.rank_position === 3 ||
          percentage >= 85
        ) {
          celebrationLevel = "silver";
          title = "وسام التفوق والامتياز الفضي 🥈";
          message =
            "هنيئاً لك هذا التفوق المشرف والإتقان العالي! قدوة طيبة ونبراس مبارك في طلب كتاب الله وسنة نبيه.";
          ayah =
            "يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ";
        } else if (percentage >= 75) {
          celebrationLevel = "bronze";
          title = "وسام الجدارة والإنجاز البرونزي 🥉";
          message =
            "مبارك هذا الأداء المتميز والمثابرة المباركة! خطوة جليلة للأمام، واصل مسيرتك القرآنية بهمة وعزيمة.";
          ayah = "إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ";
        } else if (percentage >= 50) {
          celebrationLevel = "pass";
          title = "وسام الاجتهاد والنجاح 🌸";
          message =
            "مبارك اجتيازك ونجاحك المبارك! أداء طيب ومبارك، ولك بكل حرف تتلوه حسنة والحسنة بعشر أمثالها.";
          ayah = "وَقُل رَّبِّ زِدْنِي عِلْمًا";
        } else {
          celebrationLevel = "good";
          title = "وسام شرف المحاولة والهمة القرآنية 📖";
          message =
            "تحية إجلال لمشاركتك وهمتك في كتاب الله! كل جهد مع القرآن فوز وأجر عظيم لا يضيع عند الله.";
          ayah = "وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا";
        }

        return {
          competitionId: comp.id,
          competitionName: comp.name,
          competitionType: comp.competition_type || "external",
          year: comp.year,
          maxScore,
          score: r.score,
          rank: r.rank_position,
          percentage,
          celebrationLevel,
          title,
          message,
          ayah,
          notes: r.notes || null,
        };
      });

    const hasResult = enrichedResults.length > 0;
    const latest = enrichedResults[0] || null;

    return {
      hasResult,
      student: {
        id: student.id,
        name: student.name,
        national_id: student.national_id,
      },
      results: enrichedResults,
      result: latest,
      competition: latest
        ? {
            id: latest.competitionId,
            name: latest.competitionName,
            year: latest.year,
            max_score: latest.maxScore,
            competition_type: latest.competitionType,
          }
        : null,
    };
  }
}
