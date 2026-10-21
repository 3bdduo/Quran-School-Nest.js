import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "competitions" })
export class Competition extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true })
  year: string;

  // "external" = مسابقة خارج المدرسة | "internal" = اختبار داخل المدرسة
  @Prop({ type: String, enum: ["external", "internal"], default: "external" })
  competition_type: "external" | "internal";

  // النهاية العظمى للدرجات (اختياري — لو مش محدد يعتبر 100)
  @Prop({ type: Number, default: 100 })
  max_score: number;

  @Prop({ type: Boolean, default: false })
  results_published: boolean;
}

export const CompetitionSchema = SchemaFactory.createForClass(Competition);
