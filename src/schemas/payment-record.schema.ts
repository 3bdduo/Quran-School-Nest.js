import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "payment_records" })
export class PaymentRecord extends Document {
  @Prop({ type: String, required: true })
  student_id: string;

  @Prop({ type: String, required: true })
  month_key: string;

  @Prop({ type: String, enum: ["paid", "unpaid", "exempt"], default: "unpaid" })
  status: string;

  @Prop({ type: Number })
  amount?: number;

  @Prop({ type: String })
  paid_date?: string;

  @Prop({ type: String })
  note?: string;
}

export const PaymentRecordSchema = SchemaFactory.createForClass(PaymentRecord);
PaymentRecordSchema.index({ student_id: 1, month_key: 1 }, { unique: true });
