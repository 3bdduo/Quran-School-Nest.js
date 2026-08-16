import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LoginDto {
  @IsIn(["admin", "teacher", "student"])
  role: "admin" | "teacher" | "student";

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;
}
