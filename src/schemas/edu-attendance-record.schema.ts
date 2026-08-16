import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ versionKey: false, collection: "edu_attendance_records" })
export class EduAttendanceRecord extends Document {
  @Prop({ type: String, required: true })
  edu_group_id: string;

  @Prop({ type: String, required: true })
  student_id: string;

  @Prop({ type: String, required: true })
  date: string;

  @Prop({ type: String, enum: ["حاضر", "غائب", "متأخر"], required: true })
  status: string;
}

export const EduAttendanceRecordSchema = SchemaFactory.createForClass(EduAttendanceRecord);
EduAttendanceRecordSchema.index({ edu_group_id: 1, student_id: 1, date: 1 }, { unique: true });
