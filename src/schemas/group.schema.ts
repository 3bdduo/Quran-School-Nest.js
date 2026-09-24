import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "groups" })
export class Group extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  // teacher_id references Teacher.id (nullable — حلقة ممكن تكون بدون معلم مؤقتاً)
  @Prop({ type: String, default: null })
  teacher_id?: string;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
