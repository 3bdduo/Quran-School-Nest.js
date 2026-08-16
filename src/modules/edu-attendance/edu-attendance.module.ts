import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduAttendanceRecord, EduAttendanceRecordSchema } from "../../schemas";
import { EduAttendanceService } from "./edu-attendance.service";
import { EduAttendanceController } from "./edu-attendance.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: EduAttendanceRecord.name, schema: EduAttendanceRecordSchema }])],
  controllers: [EduAttendanceController],
  providers: [EduAttendanceService],
})
export class EduAttendanceModule {}
