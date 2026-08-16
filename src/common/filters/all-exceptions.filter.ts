import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";

// فيلتر موحّد لكل الأخطاء عشان شكل الاستجابة يفضل زي القديم: { error: "..." }
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "خطأ في السيرفر";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") message = res;
      else if (typeof res === "object" && res !== null) {
        const anyRes = res as any;
        message = Array.isArray(anyRes.message) ? anyRes.message.join(", ") : anyRes.message || anyRes.error || message;
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    if (status !== HttpStatus.NO_CONTENT) {
      response.status(status).json({ error: message });
    } else {
      response.status(status).send();
    }
  }
}
