import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  EduGroup, EduGroupSchema, EduStudentRef, EduStudentRefSchema,
  EduAttendanceRecord, EduAttendanceRecordSchema, ExamRecord, ExamRecordSchema,
  Student, StudentSchema, Teacher, TeacherSchema, Group, GroupSchema,
} from "../../schemas";
import { EduGroupsService } from "./edu-groups.service";
import { EduGroupsController } from "./edu-groups.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EduGroup.name, schema: EduGroupSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
      { name: EduAttendanceRecord.name, schema: EduAttendanceRecordSchema },
      { name: ExamRecord.name, schema: ExamRecordSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
  ],
  controllers: [EduGroupsController],
  providers: [EduGroupsService],
  exports: [EduGroupsService],
})
export class EduGroupsModule {}
