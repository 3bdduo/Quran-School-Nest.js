import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import configuration from "./config/configuration";

import { AuthModule } from "./modules/auth/auth.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { GroupsModule } from "./modules/groups/groups.module";
import { EduGroupsModule } from "./modules/edu-groups/edu-groups.module";
import { StudentsModule } from "./modules/students/students.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { EduAttendanceModule } from "./modules/edu-attendance/edu-attendance.module";
import { MemorizationModule } from "./modules/memorization/memorization.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ExamsModule } from "./modules/exams/exams.module";
import { CompetitionsModule } from "./modules/competitions/competitions.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ActivityLogModule } from "./modules/activity-log/activity-log.module";
import { SalariesModule } from "./modules/salaries/salaries.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ExportsModule } from "./modules/exports/exports.module";
import { HealthModule } from "./modules/health/health.module";
import { SeedModule } from "./seed/seed.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({ uri: config.get<string>("mongoUri") }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),

    // ActivityLogModule الأول عشان الإنترسبتور بتاعه يتسجل قبل أي حاجة تانية
    ActivityLogModule,
    NotificationsModule,

    AuthModule,
    SettingsModule,
    GroupsModule,
    EduGroupsModule,
    StudentsModule,
    AttendanceModule,
    EduAttendanceModule,
    MemorizationModule,
    PaymentsModule,
    ExamsModule,
    CompetitionsModule,
    SalariesModule,
    ReportsModule,
    ExportsModule,
    HealthModule,
    SeedModule,
  ],
})
export class AppModule {}
