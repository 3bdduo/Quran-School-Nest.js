import { BadGatewayException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AskAssistantDto } from "./dto/ask-assistant.dto";

// ============================================================================
// خريطة الموقع الكاملة — كل صفحة وإيه اللي بيحصل فيها ومين يقدر يوصلها.
// ده المرجع اللي المساعد بيرد بناءً عليه، بدل ما يخمّن أو يقرا الكود وقت الرد
// (قراءة الكود وقت كل رسالة تقيلة وبطيئة ومكلفة، والخريطة دي بتتحدّث يدويًا كل ما تتضاف صفحة).
// ============================================================================
const SITE_MAP = `
صفحات عامة (متاحة لأي زائر بدون تسجيل دخول):
- "/" الصفحة الرئيسية: نبذة عن المدرسة وأحدث الأخبار.
- "/about" من نحن: معلومات عن المدرسة ورؤيتها.
- "/teachers" صفحة المعلمين: عرض عام لمعلمي المدرسة.
- "/curriculum" المنهج: تفاصيل المنهج التعليمي.
- "/media" الوسائط: صور وفيديوهات المدرسة.
- "/blog" المدونة: قائمة المقالات، و"/blog/[slug]" لعرض مقال بعينه.
- "/contact" تواصل معنا: نموذج إرسال رسالة للإدارة.
- "/register" التسجيل: نموذج تسجيل طالب جديد أو ولي أمر.
- "/login" تسجيل الدخول: دخول الأدمن أو المعلم أو الطالب بيانات مختلفة لكل دور.

لوحة تحكم الأدمن (بعد تسجيل الدخول كأدمن، تبدأ بـ "/dashboard/admin"):
- "/dashboard/admin" الرئيسية: نظرة عامة وإحصائيات.
- "/dashboard/admin/teachers" إدارة المعلمين: إضافة معلم جديد، وبعد إضافته تحديد نوعه (معلم حلقة أو معلم عادي).
- "/dashboard/admin/groups" إدارة الحلقات: عرض الحلقات وربطها بالمعلمين.
- "/dashboard/admin/students" إدارة الطلاب: إضافة/تعديل بيانات الطلاب.
- "/dashboard/admin/waiting" قائمة الانتظار: الطلاب المسجلين اللي لسه ما اتوزعوش على حلقة.
- "/dashboard/admin/attendance" الحضور والغياب: متابعة حضور الطلاب.
- "/dashboard/admin/payments" المدفوعات: متابعة مدفوعات الطلاب الشهرية.
- "/dashboard/admin/salaries" مرتبات المعلمين.
- "/dashboard/admin/competitions" المسابقات.
- "/dashboard/admin/content" إدارة المحتوى: المدونة والوسائط.
- "/dashboard/admin/messages" الرسائل: رسائل التواصل الواردة من صفحة "تواصل معنا".
- "/dashboard/admin/settings" الإعدادات العامة للموقع.

لوحة تحكم المعلم (بعد تسجيل الدخول كمعلم، تبدأ بـ "/dashboard/teacher"):
- "/dashboard/teacher" الرئيسية.
- "/dashboard/teacher/students" طلابي: قائمة طلاب المعلم (متاحة فقط لو المعلم نوعه "معلم حلقة").
- "/dashboard/teacher/attendance" تسجيل الحضور والغياب.
- "/dashboard/teacher/memorization" متابعة الحفظ.
- "/dashboard/teacher/edu-groups" المجموعات التعليمية (لمواد زي التفسير والتجويد).
- "/dashboard/teacher/salary" مرتبي.

لوحة تحكم الطالب (بعد تسجيل الدخول كطالب، تبدأ بـ "/dashboard/student"):
- "/dashboard/student" الرئيسية.
- "/dashboard/student/attendance" حضوري وغيابي.
- "/dashboard/student/memorization" متابعة حفظي.
- "/dashboard/student/payments" مدفوعاتي.
`.trim();

const SYSTEM_INSTRUCTION = `
انت المساعد الذكي لموقع "مدرسة التربية بالقرآن الكريم" — مهمتك الوحيدة إنك تساعد أي حد يستخدم الموقع (سواء زائر أو أدمن أو معلم أو طالب) يلاقي اللي محتاجه أو يعرف يعمل حاجة معينة بالظبط، خطوة بخطوة.

قواعد صارمة لازم تلتزم بيها:
1. جاوب بنفس لغة المستخدم بالظبط (عربي، إنجليزي، عامية مصرية، أو أي لغة تانية) — وكن مرن ومتفهم للهجات المختلفة.
2. اعتمد فقط على "خريطة الموقع" اللي هتوصلك — متخترعش صفحات أو مسارات مش موجودة فيها.
3. لو حد سأل إزاي يوصل لمكان معين أو يعمل حاجة، ادّيله خطوات واضحة ومرقّمة لو محتاجة أكتر من خطوة.
4. لو تقدر توديه مباشرة للصفحة اللي محتاجها (المسار موجود في الخريطة)، حط اسم المسار في navigateTo.
5. لو السؤال عن حاجة مش موجودة في الخريطة أو محتاجة بيانات حية (زي "كام طالب عندي؟")، وضّح إنك مساعد إرشادي بس ومتعرفش البيانات الحية، ووجّهه للصفحة المناسبة يشوف فيها بنفسه.
6. ردودك تكون قصيرة ومباشرة ومفيدة، من غير حشو.
7. لازم ترجع الرد بصيغة JSON فقط، بدون أي نص تاني قبله أو بعده، وبالشكل ده بالظبط:
{"reply": "نص الرد هنا", "navigateTo": "/المسار" أو null}
`.trim();

interface GeminiResponse {
  reply: string;
  navigateTo: string | null;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly config: ConfigService) {}

  async ask(dto: AskAssistantDto): Promise<GeminiResponse> {
    const apiKey = this.config.get<string>("geminiApiKey");

    if (!apiKey) {
      throw new InternalServerErrorException(
        "المساعد الذكي مش مفعّل دلوقتي — محتاج GEMINI_API_KEY في إعدادات السيرفر",
      );
    }

    const contextLines = [
      SYSTEM_INSTRUCTION,
      "",
      "خريطة الموقع:",
      SITE_MAP,
      "",
      `دور المستخدم الحالي: ${dto.role || "غير معروف (زائر على الأغلب)"}`,
      dto.currentPath ? `الصفحة اللي المستخدم فاتحها دلوقتي: ${dto.currentPath}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // نبني تاريخ المحادثة بصيغة Gemini (contents array بالأدوار user/model)
    const contents = [
      ...(dto.history || []).slice(-10).map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.text }],
      })),
      { role: "user", parts: [{ text: dto.message }] },
    ];

    const configuredModel = this.config.get<string>("geminiModel") || "gemini-flash-latest";
    // ترتيب مبني على اختبار فعلي للمفتاح ده بالذات (عبر /assistant/diagnose):
    // الأسامي دي شغالة فعلاً دلوقتي، الأقدم/الملغاة اتشالت من القائمة
    const candidateModels = [
      configuredModel,
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
    ];
    const modelsToTry = candidateModels.filter((m, i, arr) => arr.indexOf(m) === i);

    let lastError: { status: number; body: string } | null = null;
    let rawText = "";

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: contextLines }] },
            contents,
            generationConfig: {
              temperature: 0.4,
              // زودنا القيمة من 500: موديلات Gemini 3 بتستهلك جزء من التوكنز في "تفكير داخلي"
              // قبل ما تكتب الرد الظاهر، فلو القيمة قليلة ممكن يخلص الكوتة في التفكير ويرجع رد فاضي
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
        });
      } catch (err) {
        this.logger.error("Gemini request failed", err as Error);
        throw new BadGatewayException("تعذر الاتصال بخدمة المساعد الذكي حاليًا");
      }

      if (res.ok) {
        const data: any = await res.json();
        rawText =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
        if (rawText.trim()) break;
        // رد ناجح (200) لكن فاضي — نسجل السبب (finishReason غالبًا MAX_TOKENS) ونجرب موديل تاني
        const finishReason = data?.candidates?.[0]?.finishReason || "unknown";
        this.logger.warn(`Gemini returned empty text with model ${model} (finishReason: ${finishReason})`);
        lastError = { status: 200, body: `empty response, finishReason=${finishReason}` };
        continue;
      }

      const errBody = await res.text().catch(() => "");
      this.logger.error(`Gemini API error with model ${model} (${res.status}): ${errBody}`);
      lastError = { status: res.status, body: errBody };

      // If invalid API key or permission denied, no need to retry with another model
      if (
        res.status === 400 &&
        (errBody.includes("API_KEY_INVALID") || errBody.includes("API key not valid"))
      ) {
        break;
      }
      if (res.status === 403) {
        break;
      }
    }

    if (!rawText && lastError) {
      const { status, body } = lastError;
      if (body.includes("API_KEY_INVALID") || body.includes("API key not valid")) {
        throw new BadGatewayException(
          "مفتاح Gemini API غير صالح (API Key Invalid) — تأكد من نسخ المفتاح بشكل صحيح من Google AI Studio بدون مسافات أو علامات تنصيص",
        );
      }
      if (body.includes("RESOURCE_EXHAUSTED") || status === 429) {
        throw new BadGatewayException(
          "تم تجاوز حد الاستخدام المسموح به (Quota Exceeded) في حساب Google Gemini",
        );
      }
      if (body.includes("PERMISSION_DENIED") || status === 403) {
        throw new BadGatewayException(
          "تم رفض الوصول من جوجل (Permission Denied) — تأكد من تفعيل صلاحيات المفتاح في Google Cloud / AI Studio",
        );
      }
      throw new BadGatewayException("المساعد الذكي مش متاح دلوقتي، حاول تاني بعد شوية");
    }

    return this.parseModelReply(rawText);
  }

  // الموديل مفروض يرجع JSON صافي (طلبنا response_mime_type: application/json)،
  // لكن بنعمل fallback آمن لو حصل أي خروج عن الصيغة المتوقعة.
  private parseModelReply(raw: string): GeminiResponse {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return {
        reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply : "تمام، اتفضل.",
        navigateTo: typeof parsed.navigateTo === "string" && parsed.navigateTo.startsWith("/") ? parsed.navigateTo : null,
      };
    } catch {
      // لو مش JSON صالح، رجّع النص الخام كرد نصي عادي من غير توجيه
      return { reply: cleaned || "معلش، حصل خطأ في فهم السؤال، ممكن تعيد صياغته؟", navigateTo: null };
    }
  }
}
