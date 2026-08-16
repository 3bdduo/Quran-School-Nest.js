import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ versionKey: false, collection: "edu_student_refs" })
export class EduStudentRef extends Document {
  @Prop({ type: String, required: true })
  edu_group_id: string;

  @Prop({ type: String, required: true })
  student_id: string;
}

export const EduStudentRefSchema = SchemaFactory.createForClass(EduStudentRef);
EduStudentRefSchema.index({ edu_group_id: 1, student_id: 1 }, { unique: true });
