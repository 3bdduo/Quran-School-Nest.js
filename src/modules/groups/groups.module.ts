import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Group, GroupSchema, Student, StudentSchema, AttendanceRecord, AttendanceRecordSchema,
  MemorizationLog, MemorizationLogSchema, PaymentRecord, PaymentRecordSchema,
  EduStudentRef, EduStudentRefSchema, EduAttendanceRecord, EduAttendanceRecordSchema,
  ExamRecord, ExamRecordSchema, CompetitionParticipant, CompetitionParticipantSchema,
  CompetitionResult, CompetitionResultSchema,
} from "../../schemas";
import { GroupsService } from "./groups.service";
import { GroupsController } from "./groups.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Student.name, schema: StudentSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: MemorizationLog.name, schema: MemorizationLogSchema },
      { name: PaymentRecord.name, schema: PaymentRecordSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
      { name: EduAttendanceRecord.name, schema: EduAttendanceRecordSchema },
      { name: ExamRecord.name, schema: ExamRecordSchema },
      { name: CompetitionParticipant.name, schema: CompetitionParticipantSchema },
      { name: CompetitionResult.name, schema: CompetitionResultSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
