import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ContactMessage, ContactMessageSchema } from "../../schemas";
import { ContactService } from "./contact.service";
import { ContactController } from "./contact.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [MongooseModule.forFeature([{ name: ContactMessage.name, schema: ContactMessageSchema }]), NotificationsModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
