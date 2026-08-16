import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "teacher_salary_records" })
export class TeacherSalaryRecord extends Document {
  @Prop({ type: String, required: true })
  teacher_username: string;

  @Prop({ type: String, required: true })
  month_key: string;

  @Prop({ type: String, enum: ["paid", "unpaid", "advance"], default: "unpaid" })
  status: string;

  @Prop({ type: Number, default: 0 })
  amount: number;

  @Prop({ type: Number, default: 0 })
  base_salary: number;

  @Prop({ type: String })
  paid_date?: string;

  @Prop({ type: String })
  note?: string;

  @Prop({ type: String })
  paid_by?: string;
}

export const TeacherSalaryRecordSchema = SchemaFactory.createForClass(TeacherSalaryRecord);
TeacherSalaryRecordSchema.index({ teacher_username: 1, month_key: 1 }, { unique: true });
