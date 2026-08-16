import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ActivityLog, ActivityLogSchema } from "../../schemas";
import { ActivityLogService } from "./activity-log.service";
import { ActivityLogController } from "./activity-log.controller";
import { ActivityLogInterceptor } from "./activity-log.interceptor";

@Module({
  imports: [MongooseModule.forFeature([{ name: ActivityLog.name, schema: ActivityLogSchema }])],
  controllers: [ActivityLogController],
  providers: [
    ActivityLogService,
    // بنسجل الإنترسبتور كـ Global عشان يشتغل على كل الـ API من غير ما نكرره في كل موديول
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
  ],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
