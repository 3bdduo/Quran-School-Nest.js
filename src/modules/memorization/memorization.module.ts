import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MemorizationLog, MemorizationLogSchema, Student, StudentSchema, EduStudentRef, EduStudentRefSchema } from "../../schemas";
import { MemorizationService } from "./memorization.service";
import { MemorizationController } from "./memorization.controller";


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemorizationLog.name, schema: MemorizationLogSchema },
      { name: Student.name, schema: StudentSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
    ]),

  ],
  controllers: [MemorizationController],
  providers: [MemorizationService],
})
export class MemorizationModule {}
