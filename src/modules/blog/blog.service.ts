import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { BlogPost } from "../../schemas";

function slugify(title: string, id: string) {
  const base = title
    .trim()
    .replace(/[^\u0621-\u064Aa-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${base}-${id.slice(0, 8)}`;
}

@Injectable()
export class BlogService {
  constructor(@InjectModel(BlogPost.name) private readonly model: Model<BlogPost>) {}

  // عام: بيرجع بس المقالات المنشورة، مرتبة من الأحدث
  async findPublished(category?: string) {
    const filter: any = { published: true };
    if (category) filter.category = category;
    return this.model.find(filter).sort({ published_at: -1 }).lean();
  }

  async findBySlug(slug: string) {
    const post = await this.model.findOne({ slug, published: true }).lean();
    if (!post) throw new NotFoundException("المقال غير موجود");
    return post;
  }

  // أدمن: كل المقالات (منشورة وغير منشورة)
  async findAllForAdmin() {
    return this.model.find().sort({ created_at: -1 }).lean();
  }

  async create(body: { title: string; content: string; excerpt?: string; category: string; author?: string; coverImage?: string; published?: boolean }) {
    if (!body.title || !body.content || !body.category) {
      throw new ConflictException("العنوان والمحتوى والتصنيف مطلوبين");
    }
    const id = uuidv4();
    const slug = slugify(body.title, id);
    await this.model.create({
      id, title: body.title, slug, content: body.content, excerpt: body.excerpt || null,
      category: body.category, author: body.author || "إدارة المدرسة", cover_image: body.coverImage || null,
      published: !!body.published, published_at: body.published ? new Date() : null,
    });
    return this.model.findOne({ id }).lean();
  }

  async update(id: string, body: any) {
    const update: any = {};
    if (body.title) update.title = body.title;
    if (body.content) update.content = body.content;
    if (body.excerpt !== undefined) update.excerpt = body.excerpt;
    if (body.category) update.category = body.category;
    if (body.author) update.author = body.author;
    if (body.coverImage !== undefined) update.cover_image = body.coverImage;
    if (body.published !== undefined) {
      update.published = body.published;
      if (body.published) update.published_at = new Date();
    }
    if (Object.keys(update).length === 0) throw new ConflictException("لا يوجد بيانات للتحديث");

    const post = await this.model.findOneAndUpdate({ id }, update, { new: true }).lean();
    if (!post) throw new NotFoundException("المقال غير موجود");
    return post;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ id });
    if (res.deletedCount === 0) throw new NotFoundException("المقال غير موجود");
  }
}
