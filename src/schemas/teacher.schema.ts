import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "teachers" })
export class Teacher extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  full_name: string; // الاسم رباعي بالعربي

  @Prop({ type: String, required: true, unique: true })
  national_id: string; // الرقم القومي

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String, required: true, unique: true })
  username: string; // مُولَّد تلقائياً بالإنجليزية

  @Prop({ type: String, required: true })
  password: string; // hashed bcrypt

  // نوع المعلم — بيتحدد بواسطة الأدمن بعد إنشاء المعلم:
  // "group" = معلم حلقة (بيقدر يكون عنده طلاب مباشرة)
  // "other" = معلم عادي (مش حلقة — مينفعش يتضافله طلاب)
  // null = لسه محددش (حالة انتقالية لحد ما الأدمن يختار)
  @Prop({ type: String, enum: ["group", "other", null], default: null })
  teacher_type: "group" | "other" | null;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);
TeacherSchema.index({ national_id: 1 }, { unique: true });
TeacherSchema.index({ username: 1 }, { unique: true });
