import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PaymentRecord, PaymentRecordSchema, Student, StudentSchema } from "../../schemas";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentRecord.name, schema: PaymentRecordSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
