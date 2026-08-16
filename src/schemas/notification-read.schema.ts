import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ versionKey: false, collection: "notification_reads" })
export class NotificationRead extends Document {
  @Prop({ type: String, required: true })
  notification_id: string;

  @Prop({ type: String, required: true })
  username: string;

  @Prop({ type: Date, default: Date.now })
  read_at: Date;
}

export const NotificationReadSchema = SchemaFactory.createForClass(NotificationRead);
NotificationReadSchema.index({ notification_id: 1, username: 1 }, { unique: true });
