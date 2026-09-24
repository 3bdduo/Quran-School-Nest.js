import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AttendanceRecord, AttendanceRecordSchema, Student, StudentSchema } from "../../schemas";
import { AttendanceService } from "./attendance.service";
import { AttendanceController } from "./attendance.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
