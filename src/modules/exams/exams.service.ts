import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { ExamRecord, Student } from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

@Injectable()
export class ExamsService {
  constructor(
    @InjectModel(ExamRecord.name) private readonly examModel: Model<ExamRecord>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByEduGroup(user: CurrentUserPayload, eduGroupId: string) {
    if (user.role === "teacher" && user.eduGroupId !== eduGroupId) throw new ForbiddenException("ليس لديك صلاحية");

    const records = await this.examModel.find({ edu_group_id: eduGroupId }).lean();
    const examMap = new Map<string, any>();
    for (const rec of records) {
      if (!examMap.has(rec.id)) {
        examMap.set(rec.id, { examId: rec.id, name: rec.name, maxScore: rec.max_score, date: rec.date, results: [] });
      }
      examMap.get(rec.id).results.push({ student_id: rec.student_id, score: rec.score });
    }

    const studentIds = [...new Set(records.map((r) => r.student_id))];
    const students = await this.studentModel.find({ id: { $in: studentIds } }).lean();
    const nameMap = Object.fromEntries(students.map((s) => [s.id, s.name]));

    return [...examMap.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((exam) => ({
        ...exam,
        results: exam.results.map((r: any) => ({ student_id: r.student_id, student_name: nameMap[r.student_id], score: r.score })),
      }));
  }

  async create(user: CurrentUserPayload, eduGroupId: string, body: any) {
    if (user.role === "teacher" && user.eduGroupId !== eduGroupId) throw new ForbiddenException("ليس لديك صلاحية");

    const examId = uuidv4();
    const docs = body.scores.map((s: any) => ({
      id: examId, edu_group_id: eduGroupId, student_id: s.studentId, name: body.name, score: s.score, max_score: body.maxScore, date: body.date,
    }));
    await this.examModel.insertMany(docs);

    // أوتوميشن: نبلّغ كل طالب بدرجته أوتوماتيك فور رصد الامتحان
    for (const s of body.scores) {
      await this.notificationsService.notifyStudent(
        s.studentId,
        `نتيجة امتحان: ${body.name}`,
        `درجتك في امتحان "${body.name}" هي ${s.score} من ${body.maxScore}.`,
      );
    }

    return { examId, name: body.name, maxScore: body.maxScore, date: body.date, scores: body.scores };
  }

  async update(user: CurrentUserPayload, eduGroupId: string, examId: string, body: any) {
    if (user.role === "teacher" && user.eduGroupId !== eduGroupId) throw new ForbiddenException("ليس لديك صلاحية");

    const filter = { id: examId, edu_group_id: eduGroupId };
    if (body.name || body.maxScore || body.date) {
      const update: any = {};
      if (body.name) update.name = body.name;
      if (body.maxScore) update.max_score = body.maxScore;
      if (body.date) update.date = body.date;
      await this.examModel.updateMany(filter, update);
    }
    if (body.scores) {
      for (const s of body.scores) {
        await this.examModel.updateOne({ ...filter, student_id: s.studentId }, { score: s.score });
      }
    }
    return { message: "تم التحديث" };
  }

  async remove(user: CurrentUserPayload, eduGroupId: string, examId: string) {
    if (user.role === "teacher" && user.eduGroupId !== eduGroupId) throw new ForbiddenException("ليس لديك صلاحية");
    await this.examModel.deleteMany({ id: examId, edu_group_id: eduGroupId });
  }
}
