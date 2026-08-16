import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ versionKey: false, collection: "competition_results" })
export class CompetitionResult extends Document {
  @Prop({ type: String, required: true })
  competition_id: string;

  @Prop({ type: String, required: true })
  student_id: string;

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, required: true })
  rank_position: number;

  @Prop({ type: String })
  notes?: string;
}

export const CompetitionResultSchema = SchemaFactory.createForClass(CompetitionResult);
CompetitionResultSchema.index({ competition_id: 1, student_id: 1 }, { unique: true });
