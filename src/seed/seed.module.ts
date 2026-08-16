import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Settings, SettingsSchema } from "../schemas";
import { SeedService } from "./seed.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: Settings.name, schema: SettingsSchema }])],
  providers: [SeedService],
})
export class SeedModule {}
