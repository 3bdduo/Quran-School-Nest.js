// ============================================================================
// نقطة الدخول لما المشروع بيشتغل على Vercel (Serverless Functions).
// فيرسل مش بيشغّل السيرفر بـ app.listen زي الاستضافات العادية — بيستدعي
// دالة handler لكل ريكوست لوحده. فبنبني تطبيق NestJS مرة واحدة ونكاشه
// (cachedHandler) عشان منعيدش بناء التطبيق كامل مع كل طلب.
// ============================================================================
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import express from "express";
import serverless from "serverless-http";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";

let cachedHandler: any;

async function bootstrapServer() {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  const config = app.get(ConfigService);

  const corsOrigins = config.get<string[]>("corsOrigins") || [];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });

  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return serverless(expressApp);
}

// فيرسل بينده على الدالة دي لكل ريكوست جاي على /api/*
export default async (req: any, res: any) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServer();
  }
  return cachedHandler(req, res);
};