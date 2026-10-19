import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FileCategory =
  | "documents"
  | "spreadsheets"
  | "images"
  | "audio"
  | "archives"
  | "other";

@Schema({
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  versionKey: false,
  collection: "stored_files",
})
export class StoredFile extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  original_name: string;

  @Prop({ type: String, required: true })
  mime_type: string;

  @Prop({ type: String, required: true })
  extension: string;

  @Prop({
    type: String,
    enum: ["documents", "spreadsheets", "images", "audio", "archives", "other"],
    default: "other",
  })
  category: FileCategory;

  @Prop({ type: Number, required: true })
  size_bytes: number;

  @Prop({ type: Types.ObjectId, required: true })
  gridfs_id: Types.ObjectId;

  @Prop({ type: String, required: true })
  year: string;

  @Prop({ type: String, required: true })
  month: string;

  @Prop({ type: String, required: true })
  date_str: string;

  @Prop({ type: String, default: "admin" })
  uploaded_by: string;

  @Prop({ type: Number, default: 0 })
  download_count: number;

  @Prop({ type: Boolean, default: true })
  is_public: boolean;

  @Prop({ type: String })
  notes?: string;
}

export const StoredFileSchema = SchemaFactory.createForClass(StoredFile);

StoredFileSchema.index({ category: 1, year: 1, month: 1 });
StoredFileSchema.index({ created_at: -1 });
