import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { Settings } from "../../schemas";

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Settings.name) private readonly settingsModel: Model<Settings>) {}

  async get() {
    const s = await this.settingsModel.findById(1).lean();
    if (!s) throw new NotFoundException("الإعدادات غير موجودة");
    return {
      schoolName: s.school_name,
      schoolPhone: s.school_phone,
      schoolAddress: s.school_address,
      monthlyFee: s.monthly_fee,
      adminPassword: "***",
    };
  }

  // بيرجع الإعدادات الخام (من غير إخفاء الباسورد) — تستخدم داخليًا في تقارير التصدير
  async getRaw() {
    return this.settingsModel.findById(1).lean();
  }

  async update(body: { schoolName?: string; schoolPhone?: string; schoolAddress?: string; monthlyFee?: number; adminPassword?: string }) {
    const update: any = {};
    if (body.schoolName) update.school_name = body.schoolName;
    if (body.schoolPhone) update.school_phone = body.schoolPhone;
    if (body.schoolAddress) update.school_address = body.schoolAddress;
    if (body.monthlyFee) update.monthly_fee = body.monthlyFee;
    if (body.adminPassword) update.admin_password = await bcrypt.hash(body.adminPassword, 10);

    if (Object.keys(update).length === 0) {
      throw new NotFoundException("لا يوجد بيانات للتحديث");
    }

    const s = await this.settingsModel.findByIdAndUpdate(1, update, { new: true }).lean();
    return {
      schoolName: s.school_name,
      schoolPhone: s.school_phone,
      schoolAddress: s.school_address,
      monthlyFee: s.monthly_fee,
    };
  }
}
