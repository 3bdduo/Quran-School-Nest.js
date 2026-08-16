// سكريبت يدوي بديل عن npm run seed لو حبيت تشغّل الـ Seed لوحدها من غير ما تشغل السيرفر كامل
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.close();
  console.log("✅ تم تنفيذ الـ Seed (بيشتغل أوتوماتيك برضه عند تشغيل السيرفر العادي)");
}
bootstrap();
