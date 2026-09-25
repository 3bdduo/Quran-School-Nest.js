import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class AssistantHistoryItemDto {
  @IsIn(["user", "assistant"])
  role: "user" | "assistant";

  @IsString()
  @MaxLength(4000)
  text: string;
}

export class AskAssistantDto {
  @IsString()
  @IsNotEmpty({ message: "الرسالة مطلوبة" })
  @MaxLength(1000, { message: "الرسالة طويلة جدًا" })
  message: string;

  // آخر كام رسالة من نفس المحادثة (اختياري) — عشان السياق يفضل متصل
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantHistoryItemDto)
  history?: AssistantHistoryItemDto[];

  // دور المستخدم الحالي لو معروف (زائر / أدمن / معلم / طالب) — بيساعد يرشّح الاقتراحات المناسبة
  @IsOptional()
  @IsIn(["guest", "admin", "teacher", "student"])
  role?: "guest" | "admin" | "teacher" | "student";

  // المسار الحالي اللي المستخدم فاتحه، لو حابب يدّي سياق إضافي
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPath?: string;
}
