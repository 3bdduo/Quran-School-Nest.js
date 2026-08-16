import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: false, updatedAt: "updated_at" }, versionKey: false })
export class Settings extends Document {
  @Prop({ type: Number, default: 1 })
  _id: number;

  @Prop({ type: String, default: "مدرسة التربية بالقرءان الكريم" })
  school_name: string;

  @Prop({ type: String })
  school_phone?: string;

  @Prop({ type: String })
  school_address?: string;

  @Prop({ type: Number, default: 200 })
  monthly_fee: number;

  @Prop({ type: String, required: true })
  admin_password: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
