import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  const corsOrigins = config.get<string[]>("corsOrigins") || [];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });

  // مسار /health بره البادئة /api/v1 زي ما كان بالظبط في النسخة القديمة
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const port = config.get<number>("port") || 3000;
  await app.listen(port, "0.0.0.0");
  logger.log(`🕌 Quran School API (NestJS) — يعمل على المنفذ ${port}`);
  logger.log(`📍 http://localhost:${port}/api/v1`);
  logger.log(`✅ Health: http://localhost:${port}/health`);
}

bootstrap();
