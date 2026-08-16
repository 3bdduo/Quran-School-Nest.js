import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: false }, versionKey: false, collection: "memorization_log" })
export class MemorizationLog extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  student_id: string;

  @Prop({ type: String, required: true })
  date: string;

  @Prop({ type: String, required: true })
  added_amount: string;

  @Prop({ type: String, required: true })
  total_after: string;

  @Prop({ type: String })
  teacher_note?: string;
}

export const MemorizationLogSchema = SchemaFactory.createForClass(MemorizationLog);
