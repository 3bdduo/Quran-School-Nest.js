import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "teacher_profiles" })
export class TeacherProfile extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  photo_url?: string;

  @Prop({ type: String })
  specialty?: string;

  @Prop({ type: [String], default: [] })
  ijazahs: string[];

  @Prop({ type: String })
  bio?: string;

  // اختياري: ربط بروفايل المعلم العام بحساب دخوله الفعلي في النظام (Group/EduGroup)
  @Prop({ type: String })
  linked_username?: string;

  @Prop({ type: Number, default: 0 })
  display_order: number;

  @Prop({ type: Boolean, default: true })
  published: boolean;
}

export const TeacherProfileSchema = SchemaFactory.createForClass(TeacherProfile);
TeacherProfileSchema.index({ published: 1, display_order: 1 });
