import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Student, StudentSchema, Settings, SettingsSchema, PaymentRecord, PaymentRecordSchema,
  AttendanceRecord, AttendanceRecordSchema, MemorizationLog, MemorizationLogSchema,
  EduStudentRef, EduStudentRefSchema, EduAttendanceRecord, EduAttendanceRecordSchema,
  ExamRecord, ExamRecordSchema, CompetitionParticipant, CompetitionParticipantSchema,
  CompetitionResult, CompetitionResultSchema,
} from "../../schemas";
import { StudentsService } from "./students.service";
import { StudentsController } from "./students.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Settings.name, schema: SettingsSchema },
      { name: PaymentRecord.name, schema: PaymentRecordSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: MemorizationLog.name, schema: MemorizationLogSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
      { name: EduAttendanceRecord.name, schema: EduAttendanceRecordSchema },
      { name: ExamRecord.name, schema: ExamRecordSchema },
      { name: CompetitionParticipant.name, schema: CompetitionParticipantSchema },
      { name: CompetitionResult.name, schema: CompetitionResultSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
