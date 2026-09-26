import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator";
import { AssistantService } from "./assistant.service";
import { AskAssistantDto } from "./dto/ask-assistant.dto";

@Controller("assistant")
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  // متاح لأي حد (زائر أو مسجل دخول) — المساعد بيرشد على الموقع نفسه فقط.
  // معدّل محدود (20 رسالة / 10 دقايق لكل IP) عشان نحمي الـ API key من الاستهلاك الزيادة أو السبام.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @Post("ask")
  ask(@Body() dto: AskAssistantDto) {
    return this.service.ask(dto);
  }
}
