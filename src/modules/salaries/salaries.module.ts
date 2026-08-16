import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TeacherSalaryConfig, TeacherSalaryConfigSchema, TeacherSalaryRecord, TeacherSalaryRecordSchema } from "../../schemas";
import { SalariesService } from "./salaries.service";
import { SalariesController } from "./salaries.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeacherSalaryConfig.name, schema: TeacherSalaryConfigSchema },
      { name: TeacherSalaryRecord.name, schema: TeacherSalaryRecordSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [SalariesController],
  providers: [SalariesService],
  exports: [SalariesService],
})
export class SalariesModule {}
