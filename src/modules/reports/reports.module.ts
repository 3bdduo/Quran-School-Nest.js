import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Group, GroupSchema, EduGroup, EduGroupSchema, Student, StudentSchema,
  AttendanceRecord, AttendanceRecordSchema, PaymentRecord, PaymentRecordSchema,
  MemorizationLog, MemorizationLogSchema, EduStudentRef, EduStudentRefSchema,
} from "../../schemas";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: EduGroup.name, schema: EduGroupSchema },
      { name: Student.name, schema: StudentSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: PaymentRecord.name, schema: PaymentRecordSchema },
      { name: MemorizationLog.name, schema: MemorizationLogSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
