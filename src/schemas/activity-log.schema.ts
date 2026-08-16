import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ versionKey: false, collection: "activity_log" })
export class ActivityLog extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, enum: ["admin", "teacher", "student", "system"], required: true })
  actor_role: string;

  @Prop({ type: String, required: true })
  actor_username: string;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: String })
  method?: string;

  @Prop({ type: String })
  path?: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ actor_username: 1 });
