import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "edu_groups" })
export class EduGroup extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  teacher_username: string;

  @Prop({ type: String, required: true })
  teacher_password: string;
}

export const EduGroupSchema = SchemaFactory.createForClass(EduGroup);
