import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type RayhanaLevel =
  | "level_3"
  | "level_5"
  | "level_10"
  | "level_20"
  | "level_full";

@Schema({
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  versionKey: false,
  collection: "rayhana_participants",
})
export class RayhanaParticipant extends Document {
  @Prop({ type: String, required: true })
  student_id: string;

  @Prop({ type: String, required: true, default: new Date().getFullYear().toString() })
  year: string;

  @Prop({
    type: String,
    enum: ["level_3", "level_5", "level_10", "level_20", "level_full"],
    default: "level_3",
  })
  current_level: RayhanaLevel;

  @Prop({ type: Boolean, default: false })
  passed: boolean;

  @Prop({ type: Date })
  promoted_at?: Date;

  @Prop({ type: String })
  notes?: string;
}

export const RayhanaParticipantSchema = SchemaFactory.createForClass(RayhanaParticipant);

// Index مركّب عشان نضمن كل طالب مرة واحدة في كل سنة
RayhanaParticipantSchema.index({ student_id: 1, year: 1 }, { unique: true });
