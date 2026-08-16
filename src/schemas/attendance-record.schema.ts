import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ versionKey: false, collection: "attendance_records" })
export class AttendanceRecord extends Document {
  @Prop({ type: String, required: true })
  student_id: string;

  @Prop({ type: String, required: true })
  date: string;

  @Prop({ type: String, enum: ["حاضر", "غائب", "متأخر"], required: true })
  status: string;
}

export const AttendanceRecordSchema = SchemaFactory.createForClass(AttendanceRecord);
AttendanceRecordSchema.index({ student_id: 1, date: 1 }, { unique: true });
