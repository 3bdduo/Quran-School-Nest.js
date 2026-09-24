import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Competition, CompetitionSchema, CompetitionParticipant, CompetitionParticipantSchema,
  CompetitionResult, CompetitionResultSchema, Student, StudentSchema, EduStudentRef, EduStudentRefSchema,
} from "../../schemas";
import { CompetitionsService } from "./competitions.service";
import { CompetitionsController } from "./competitions.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Competition.name, schema: CompetitionSchema },
      { name: CompetitionParticipant.name, schema: CompetitionParticipantSchema },
      { name: CompetitionResult.name, schema: CompetitionResultSchema },
      { name: Student.name, schema: StudentSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
    ]),
  ],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}
