import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { Settings } from "../schemas";

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    private readonly configService: ConfigService,
  ) {}

  // بيشتغل أوتوماتيك أول ما السيرفر يشتغل — بديل استدعاء seedDB() اليدوي القديم
  async onApplicationBootstrap() {
    const existing = await this.settingsModel.findById(1);
    if (existing) return;

    const defaultPassword = this.configService.get<string>("adminDefaultPassword") || "Admin123";
    const adminPassword = await bcrypt.hash(defaultPassword, 10);

    await this.settingsModel.create({
      _id: 1,
      school_name: "مدرسة التربية بالقرءان الكريم",
      school_phone: null,
      school_address: null,
      monthly_fee: 200,
      admin_password: adminPassword,
    });

    this.logger.log("✅ تم إنشاء الإعدادات الافتراضية (اسم دخول الأدمن: Admin)");
  }
}
