import { IsOptional, IsString, Length, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";
import { validateFullName, validateEgyptianNationalId, validateEgyptianPhone } from "../../../common/validation.utils";

@ValidatorConstraint({ name: "IsEgyptianFullNameOpt", async: false })
class IsEgyptianFullNameOpt implements ValidatorConstraintInterface {
  validate(value: string) { return !value || validateFullName(value).valid; }
  defaultMessage(_args: ValidationArguments) { return validateFullName(_args.value).message || "الاسم غير صحيح"; }
}

@ValidatorConstraint({ name: "IsEgyptianNidOpt", async: false })
class IsEgyptianNidOpt implements ValidatorConstraintInterface {
  validate(value: string) { return !value || validateEgyptianNationalId(value).valid; }
  defaultMessage(_args: ValidationArguments) { return validateEgyptianNationalId(_args.value).message || "الرقم القومي غير صحيح"; }
}

@ValidatorConstraint({ name: "IsEgyptianPhoneOpt", async: false })
class IsEgyptianPhoneOpt implements ValidatorConstraintInterface {
  validate(value: string) { return !value || validateEgyptianPhone(value).valid; }
  defaultMessage(_args: ValidationArguments) { return validateEgyptianPhone(_args.value).message || "رقم الهاتف غير صحيح"; }
}

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @Validate(IsEgyptianFullNameOpt)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Validate(IsEgyptianNidOpt)
  national_id?: string;

  @IsOptional()
  @IsString()
  @Validate(IsEgyptianPhoneOpt)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(6, 100, { message: "كلمة المرور لازم تكون 6 أحرف على الأقل" })
  password?: string;
}
