import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MediaItem, MediaItemSchema } from "../../schemas";
import { MediaLibraryService } from "./media-library.service";
import { MediaLibraryController } from "./media-library.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: MediaItem.name, schema: MediaItemSchema }])],
  controllers: [MediaLibraryController],
  providers: [MediaLibraryService],
})
export class MediaLibraryModule {}
