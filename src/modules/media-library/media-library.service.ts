import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { MediaItem } from "../../schemas";

@Injectable()
export class MediaLibraryService {
  constructor(@InjectModel(MediaItem.name) private readonly model: Model<MediaItem>) {}

  async findPublished(track?: string, level?: string) {
    const filter: any = { published: true };
    if (track) filter.track = track;
    if (level) filter.level = level;
    return this.model.find(filter).sort({ created_at: -1 }).lean();
  }

  async findOne(id: string) {
    const item = await this.model.findOne({ id, published: true }).lean();
    if (!item) throw new NotFoundException("العنصر غير موجود");
    return item;
  }

  async findAllForAdmin() {
    return this.model.find().sort({ created_at: -1 }).lean();
  }

  async create(body: any) {
    if (!body.title || !body.videoUrl || !body.track) {
      throw new ConflictException("العنوان ورابط الفيديو والمسار مطلوبين");
    }
    const id = uuidv4();
    await this.model.create({
      id, title: body.title, description: body.description || null, video_url: body.videoUrl,
      thumbnail_url: body.thumbnailUrl || null, track: body.track, level: body.level || null,
      teacher_name: body.teacherName || null, is_live: !!body.isLive,
      published: body.published !== undefined ? body.published : true,
    });
    return this.model.findOne({ id }).lean();
  }

  async update(id: string, body: any) {
    const update: any = {};
    if (body.title) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.videoUrl) update.video_url = body.videoUrl;
    if (body.thumbnailUrl !== undefined) update.thumbnail_url = body.thumbnailUrl;
    if (body.track) update.track = body.track;
    if (body.level !== undefined) update.level = body.level;
    if (body.teacherName !== undefined) update.teacher_name = body.teacherName;
    if (body.isLive !== undefined) update.is_live = body.isLive;
    if (body.published !== undefined) update.published = body.published;
    if (Object.keys(update).length === 0) throw new ConflictException("لا يوجد بيانات للتحديث");

    const item = await this.model.findOneAndUpdate({ id }, update, { new: true }).lean();
    if (!item) throw new NotFoundException("العنصر غير موجود");
    return item;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ id });
    if (res.deletedCount === 0) throw new NotFoundException("العنصر غير موجود");
  }
}
