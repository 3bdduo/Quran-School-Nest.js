import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Competition, CompetitionSchema, CompetitionParticipant, CompetitionParticipantSchema,
  CompetitionResult, CompetitionResultSchema, Student, StudentSchema, EduStudentRef, EduStudentRefSchema,
} from "../../schemas";
import { CompetitionsService } from "./competitions.service";
import { CompetitionsController } from "./competitions.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Competition.name, schema: CompetitionSchema },
      { name: CompetitionParticipant.name, schema: CompetitionParticipantSchema },
      { name: CompetitionResult.name, schema: CompetitionResultSchema },
      { name: Student.name, schema: StudentSchema },
      { name: EduStudentRef.name, schema: EduStudentRefSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}
