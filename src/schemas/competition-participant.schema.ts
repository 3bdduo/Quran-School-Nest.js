import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ versionKey: false, collection: "competition_participants" })
export class CompetitionParticipant extends Document {
  @Prop({ type: String, required: true })
  competition_id: string;

  @Prop({ type: String, required: true })
  student_id: string;
}

export const CompetitionParticipantSchema = SchemaFactory.createForClass(CompetitionParticipant);
CompetitionParticipantSchema.index({ competition_id: 1, student_id: 1 }, { unique: true });
