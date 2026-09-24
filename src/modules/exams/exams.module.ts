import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ExamRecord, ExamRecordSchema, Student, StudentSchema } from "../../schemas";
import { ExamsService } from "./exams.service";
import { ExamsController } from "./exams.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExamRecord.name, schema: ExamRecordSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
