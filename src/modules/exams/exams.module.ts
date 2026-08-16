import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ExamRecord, ExamRecordSchema, Student, StudentSchema } from "../../schemas";
import { ExamsService } from "./exams.service";
import { ExamsController } from "./exams.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExamRecord.name, schema: ExamRecordSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
