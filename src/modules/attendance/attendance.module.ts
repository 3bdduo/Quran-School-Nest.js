import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AttendanceRecord, AttendanceRecordSchema, Student, StudentSchema } from "../../schemas";
import { AttendanceService } from "./attendance.service";
import { AttendanceController } from "./attendance.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
