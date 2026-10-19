import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  RayhanaParticipant,
  RayhanaParticipantSchema,
  Student,
  StudentSchema,
  Settings,
  SettingsSchema,
} from "../../schemas";
import { RayhanaService } from "./rayhana.service";
import { RayhanaController } from "./rayhana.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RayhanaParticipant.name, schema: RayhanaParticipantSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Settings.name, schema: SettingsSchema },
    ]),
  ],
  controllers: [RayhanaController],
  providers: [RayhanaService],
  exports: [RayhanaService],
})
export class RayhanaModule {}
