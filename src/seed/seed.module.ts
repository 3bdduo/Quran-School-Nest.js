import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Settings, SettingsSchema, BlogPost, BlogPostSchema, MediaItem, MediaItemSchema } from "../schemas";
import { SeedService } from "./seed.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
      { name: BlogPost.name, schema: BlogPostSchema },
      { name: MediaItem.name, schema: MediaItemSchema },
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
