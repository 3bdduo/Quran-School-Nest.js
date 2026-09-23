import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { ContactMessage } from "../../schemas";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(ContactMessage.name) private readonly model: Model<ContactMessage>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submit(body: { name: string; email: string; phone?: string; message: string }) {
    if (!body.name || !body.email || !body.message) {
      throw new BadRequestException("الاسم والبريد الإلكتروني والرسالة مطلوبين");
    }
    const id = uuidv4();
    await this.model.create({ id, name: body.name, email: body.email, phone: body.phone || null, message: body.message });

    // أوتوميشن: نبلّغ الأدمن أوتوماتيك برسالة تواصل جديدة
    await this.notificationsService.notifyAll("رسالة تواصل جديدة", `رسالة جديدة من ${body.name} (${body.email})`);

    return { message: "تم إرسال رسالتك بنجاح، سنتواصل معك قريبًا بإذن الله" };
  }

  async findAll(status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    return this.model.find(filter).sort({ created_at: -1 }).lean();
  }

  async markRead(id: string) {
    const msg = await this.model.findOneAndUpdate({ id }, { status: "read" }, { new: true }).lean();
    if (!msg) throw new NotFoundException("الرسالة غير موجودة");
    return msg;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ id });
    if (res.deletedCount === 0) throw new NotFoundException("الرسالة غير موجودة");
  }
}
