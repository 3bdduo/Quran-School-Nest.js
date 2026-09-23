import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, collection: "blog_posts" })
export class BlogPost extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String })
  excerpt?: string;

  @Prop({ type: String, enum: ["فوائد قرآنية", "تجويد", "تربية", "أخبار المدرسة"], required: true })
  category: string;

  @Prop({ type: String, default: "إدارة المدرسة" })
  author: string;

  @Prop({ type: String })
  cover_image?: string;

  @Prop({ type: Boolean, default: false })
  published: boolean;

  @Prop({ type: Date })
  published_at?: Date;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);
BlogPostSchema.index({ published: 1, published_at: -1 });
