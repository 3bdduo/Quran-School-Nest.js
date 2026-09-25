import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Settings, SettingsSchema, Teacher, TeacherSchema, Student, StudentSchema, Group, GroupSchema, EduGroup, EduGroupSchema,
  EduStudentRef, EduStudentRefSchema, EduAttendanceRecord, EduAttendanceRecordSchema,
  PaymentRecord, PaymentRecordSchema, AttendanceRecord, AttendanceRecordSchema,
  MemorizationLog, MemorizationLogSchema, TeacherSalaryConfig, TeacherSalaryConfigSchema,
  TeacherSalaryRecord, TeacherSalaryRecordSchema, Competition, CompetitionSchema,
  CompetitionResult, CompetitionResultSchema,
} from "../../schemas";
import { ExportsService } from "./exports.service";
import { ExportsController } from "./exports.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Group.name, schema: GroupSchema },
      { name: EduGroup.name, schema: EduGroupSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
      { name: EduAttendanceRecord.name, schema: EduAttendanceRecordSchema },
      { name: PaymentRecord.name, schema: PaymentRecordSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: MemorizationLog.name, schema: MemorizationLogSchema },
      { name: TeacherSalaryConfig.name, schema: TeacherSalaryConfigSchema },
      { name: TeacherSalaryRecord.name, schema: TeacherSalaryRecordSchema },
      { name: Competition.name, schema: CompetitionSchema },
      { name: CompetitionResult.name, schema: CompetitionResultSchema },
    ]),
  ],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
