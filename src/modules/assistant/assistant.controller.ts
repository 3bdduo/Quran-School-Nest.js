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
      
      const candidateModels = [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-2.5-flash-lite",
      ];

      const modelTestResults: any = {};
      for (const m of candidateModels) {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        try {
          const testRes = await fetch(testUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "hi" }] }],
            }),
          });
          const text = await testRes.text();
          modelTestResults[m] = {
            status: testRes.status,
            body: text.substring(0, 200),
          };
        } catch (e: any) {
          modelTestResults[m] = { error: e.message };
        }
      }

      return {
        keyFound: true,
        maskedKey,
        keyLength: key.length,
        modelTestResults,
      };
    } catch (err: any) {
      return { keyFound: true, maskedKey, fetchError: err.message };
    }
  }
}
