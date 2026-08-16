import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Settings, SettingsSchema, Student, StudentSchema, Group, GroupSchema, EduGroup, EduGroupSchema,
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
      { name: Student.name, schema: StudentSchema },
      { name: Group.name, schema: GroupSchema },
      { name: EduGroup.name, schema: EduGroupSchema },
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
