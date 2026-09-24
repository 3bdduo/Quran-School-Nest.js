import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Teacher, TeacherSchema, TeacherSalaryConfig, TeacherSalaryConfigSchema, TeacherSalaryRecord, TeacherSalaryRecordSchema } from "../../schemas";
import { SalariesService } from "./salaries.service";
import { SalariesController } from "./salaries.controller";


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Teacher.name, schema: TeacherSchema },
      { name: TeacherSalaryConfig.name, schema: TeacherSalaryConfigSchema },
      { name: TeacherSalaryRecord.name, schema: TeacherSalaryRecordSchema },
    ]),

  ],
  controllers: [SalariesController],
  providers: [SalariesService],
  exports: [SalariesService],
})
export class SalariesModule {}
