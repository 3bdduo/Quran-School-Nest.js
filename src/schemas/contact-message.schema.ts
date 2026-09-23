import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: false }, versionKey: false, collection: "contact_messages" })
export class ContactMessage extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, enum: ["unread", "read"], default: "unread" })
  status: string;
}

export const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);
ContactMessageSchema.index({ status: 1, created_at: -1 });
