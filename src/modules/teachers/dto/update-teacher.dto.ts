import { IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @Length(5, 100)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: "الرقم القومي يجب أن يكون 14 رقماً" })
  national_id?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(6, 100, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" })
  password?: string;
}
