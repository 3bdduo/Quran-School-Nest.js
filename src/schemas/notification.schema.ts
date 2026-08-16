import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: false }, versionKey: false, collection: "notifications" })
export class Notification extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  body: string;

  // "all" | "teachers" | <groupId> | <eduGroupId> | "student:<studentId>" | "teacher:<username>"
  @Prop({ type: String, required: true })
  target: string;

  @Prop({ type: Boolean, default: false })
  auto_generated: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ created_at: -1 });
