import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Settings, SettingsSchema } from "../../schemas";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: Settings.name, schema: SettingsSchema }])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
