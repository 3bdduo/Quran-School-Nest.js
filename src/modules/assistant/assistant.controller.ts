import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../common/decorators/public.decorator";
import { AssistantService } from "./assistant.service";
import { AskAssistantDto } from "./dto/ask-assistant.dto";

@Controller("assistant")
export class AssistantController {
  constructor(
    private readonly service: AssistantService,
    private readonly config: ConfigService,
  ) {}

  // متاح لأي حد (زائر أو مسجل دخول) — المساعد بيرشد على الموقع نفسه فقط.
  // معدّل محدود (20 رسالة / 10 دقايق لكل IP) عشان نحمي الـ API key من الاستهلاك الزيادة أو السبام.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @Post("ask")
  ask(@Body() dto: AskAssistantDto) {
    return this.service.ask(dto);
  }

  // مؤقت للتشخيص — بيختبر المفتاح مباشرة ويرجع الرد الخام من جوجل
  @Public()
  @Get("diagnose")
  async diagnose() {
    const key = this.config.get<string>("geminiApiKey");
    if (!key) return { keyFound: false, message: "GEMINI_API_KEY غير موجود في environment variables" };

    const maskedKey = key.substring(0, 8) + "..." + key.substring(key.length - 4);
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
      const res = await fetch(listUrl);
      const data: any = await res.json();
      const modelNames = data?.models?.map((m: any) => m.name.replace("models/", "")) || [];
      
      const candidateModel = "gemini-3.8-flash";
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${key}`;
      const testRes = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "رد بكلمة واحدة: شغال" }] }],
        }),
      });
      const testBody = await testRes.text();

      return {
        keyFound: true,
        maskedKey,
        keyLength: key.length,
        modelsCount: modelNames.length,
        availableModels: modelNames,
        testedModel: candidateModel,
        testHttpStatus: testRes.status,
        testResponse: JSON.parse(testBody),
      };
    } catch (err: any) {
      return { keyFound: true, maskedKey, fetchError: err.message };
    }
  }
}
