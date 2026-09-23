import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { TeacherProfile } from "../../schemas";

@Injectable()
export class TeacherProfilesService {
  constructor(@InjectModel(TeacherProfile.name) private readonly model: Model<TeacherProfile>) {}

  async findPublished() {
    return this.model.find({ published: true }).sort({ display_order: 1, name: 1 }).lean();
  }

  async findOne(id: string) {
    const profile = await this.model.findOne({ id, published: true }).lean();
    if (!profile) throw new NotFoundException("بروفايل المعلم غير موجود");
    return profile;
  }

  async findAllForAdmin() {
    return this.model.find().sort({ display_order: 1 }).lean();
  }

  async create(body: any) {
    if (!body.name) throw new ConflictException("اسم المعلم مطلوب");
    const id = uuidv4();
    await this.model.create({
      id, name: body.name, photo_url: body.photoUrl || null, specialty: body.specialty || null,
      ijazahs: body.ijazahs || [], bio: body.bio || null, linked_username: body.linkedUsername || null,
      display_order: body.displayOrder || 0, published: body.published !== undefined ? body.published : true,
    });
    return this.model.findOne({ id }).lean();
  }

  async update(id: string, body: any) {
    const update: any = {};
    if (body.name) update.name = body.name;
    if (body.photoUrl !== undefined) update.photo_url = body.photoUrl;
    if (body.specialty !== undefined) update.specialty = body.specialty;
    if (body.ijazahs !== undefined) update.ijazahs = body.ijazahs;
    if (body.bio !== undefined) update.bio = body.bio;
    if (body.linkedUsername !== undefined) update.linked_username = body.linkedUsername;
    if (body.displayOrder !== undefined) update.display_order = body.displayOrder;
    if (body.published !== undefined) update.published = body.published;
    if (Object.keys(update).length === 0) throw new ConflictException("لا يوجد بيانات للتحديث");

    const profile = await this.model.findOneAndUpdate({ id }, update, { new: true }).lean();
    if (!profile) throw new NotFoundException("بروفايل المعلم غير موجود");
    return profile;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ id });
    if (res.deletedCount === 0) throw new NotFoundException("بروفايل المعلم غير موجود");
  }
}
