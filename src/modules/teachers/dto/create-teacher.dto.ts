import { IsNotEmpty, IsString, IsOptional, Length, Matches } from "class-validator";

export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty({ message: "الاسم الرباعي مطلوب" })
  @Length(5, 100, { message: "الاسم يجب أن يكون بين 5 و 100 حرف" })
  full_name: string; // الاسم رباعي بالعربي

  @IsString()
  @IsNotEmpty({ message: "الرقم القومي مطلوب" })
  @Matches(/^\d{14}$/, { message: "الرقم القومي يجب أن يكون 14 رقماً" })
  national_id: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: "كلمة المرور مطلوبة" })
  @Length(6, 100, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" })
  password: string;
}
