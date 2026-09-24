import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ContactMessage, ContactMessageSchema } from "../../schemas";
import { ContactService } from "./contact.service";
import { ContactController } from "./contact.controller";


@Module({
  imports: [MongooseModule.forFeature([{ name: ContactMessage.name, schema: ContactMessageSchema }])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
