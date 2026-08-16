import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { ActivityLogService } from "./activity-log.service";
import { LOG_ACTION_KEY } from "../../common/decorators/log-action.decorator";

// ============================================================================
// أوتوميشن سجل النشاطات:
// في النسخة القديمة، الفرونت إند كان لازم يبعت طلب POST /activity-log يدوي
// بعد كل عملية عشان تتسجل في السجل — ده كان بيتنسى كتير وبيبوظ دقة السجل.
// دلوقتي أي عملية إضافة/تعديل/حذف ناجحة بتتسجل أوتوماتيك من غير أي تدخل
// من الفرونت إند، باستخدام بيانات اليوزر من التوكن نفسه.
// ============================================================================
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  private readonly actionVerbs: Record<string, string> = {
    POST: "إضافة",
    PUT: "تعديل",
    PATCH: "تعديل",
    DELETE: "حذف",
  };

  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, user, body } = request;

    return next.handle().pipe(
      tap((responseBody) => {
        if (!this.mutatingMethods.includes(method)) return;

        const customAction = this.reflector.get<string>(LOG_ACTION_KEY, context.getHandler());

        // حالة تسجيل الدخول: اليوزر لسه معندهوش توكن وقت الطلب، فبناخد بياناته من الاستجابة
        if (!user && originalUrl?.includes("/auth/login") && responseBody?.user) {
          this.activityLogService
            .log(responseBody.user.role, responseBody.user.username, "تسجيل دخول للنظام", method, originalUrl)
            .catch(() => undefined);
          return;
        }

        if (!user) return; // مفيش يوزر معروف (مثلاً مسار عام) فمفيش داعي نسجل

        const action = customAction || `${this.actionVerbs[method] || method} على ${originalUrl}`;
        this.activityLogService
          .log(user.role, user.username, action, method, originalUrl)
          .catch(() => undefined); // فشل تسجيل النشاط ميوقفش الطلب الأساسي
      }),
    );
  }
}
