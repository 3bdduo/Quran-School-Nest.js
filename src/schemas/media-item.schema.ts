import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "media_items" })
export class MediaItem extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true })
  video_url: string;

  @Prop({ type: String })
  thumbnail_url?: string;

  @Prop({ type: String, enum: ["تحفيظ", "تفسير وتجويد", "علوم شرعية"], required: true })
  track: string;

  @Prop({ type: String })
  level?: string;

  @Prop({ type: String })
  teacher_name?: string;

  @Prop({ type: Boolean, default: false })
  is_live: boolean;

  @Prop({ type: Boolean, default: true })
  published: boolean;
}

export const MediaItemSchema = SchemaFactory.createForClass(MediaItem);
MediaItemSchema.index({ published: 1, track: 1, created_at: -1 });
