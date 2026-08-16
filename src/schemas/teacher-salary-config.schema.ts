import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: false, updatedAt: "updated_at" }, versionKey: false, collection: "teacher_salary_configs" })
export class TeacherSalaryConfig extends Document {
  @Prop({ type: String, required: true, unique: true })
  teacher_username: string;

  @Prop({ type: Number, default: 0 })
  base_salary: number;

  @Prop({ type: String })
  notes?: string;
}

export const TeacherSalaryConfigSchema = SchemaFactory.createForClass(TeacherSalaryConfig);
