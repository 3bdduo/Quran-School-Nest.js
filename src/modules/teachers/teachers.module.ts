import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Teacher, TeacherSchema, Group, GroupSchema } from "../../schemas";
import { TeachersController } from "./teachers.controller";
import { TeachersService } from "./teachers.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Teacher.name, schema: TeacherSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
