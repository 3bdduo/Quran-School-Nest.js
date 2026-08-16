import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MemorizationLog, MemorizationLogSchema, Student, StudentSchema, EduStudentRef, EduStudentRefSchema } from "../../schemas";
import { MemorizationService } from "./memorization.service";
import { MemorizationController } from "./memorization.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemorizationLog.name, schema: MemorizationLogSchema },
      { name: Student.name, schema: StudentSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [MemorizationController],
  providers: [MemorizationService],
})
export class MemorizationModule {}
