import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: false }, versionKey: false, collection: "exam_records" })
export class ExamRecord extends Document {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  edu_group_id: string;

  @Prop({ type: String, required: true })
  student_id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, required: true })
  max_score: number;

  @Prop({ type: String, required: true })
  date: string;
}

export const ExamRecordSchema = SchemaFactory.createForClass(ExamRecord);
ExamRecordSchema.index({ id: 1, edu_group_id: 1, student_id: 1 });
