import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "students" })
export class Student extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  national_id: string;

  @Prop({ type: String, required: true })
  date_of_birth: string;

  @Prop({ type: Number, required: true })
  age: number;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String, default: "0" })
  memorized_amount: string;

  @Prop({ type: String, required: true })
  group_id: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  password?: string;

  @Prop({ type: Number, default: 200 })
  monthly_fee: number;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
