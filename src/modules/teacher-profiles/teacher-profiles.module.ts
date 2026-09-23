import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TeacherProfile, TeacherProfileSchema } from "../../schemas";
import { TeacherProfilesService } from "./teacher-profiles.service";
import { TeacherProfilesController } from "./teacher-profiles.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: TeacherProfile.name, schema: TeacherProfileSchema }])],
  controllers: [TeacherProfilesController],
  providers: [TeacherProfilesService],
})
export class TeacherProfilesModule {}
