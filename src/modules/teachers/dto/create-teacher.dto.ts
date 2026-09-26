import { IsNotEmpty, IsString, IsOptional, Length, Matches, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";
import { validateFullName, validateEgyptianNationalId, validateEgyptianPhone } from "../../../common/validation.utils";

@ValidatorConstraint({ name: "IsEgyptianFullName", async: false })
class IsEgyptianFullNameConstraint implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments) {
    return validateFullName(value).valid;
  }
  defaultMessage(_args: ValidationArguments) {
    return validateFullName(_args.value).message || "الاسم غير صحيح";
  }
}

@ValidatorConstraint({ name: "IsEgyptianNid", async: false })
class IsEgyptianNidConstraint implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments) {
    return validateEgyptianNationalId(value).valid;
  }
  defaultMessage(_args: ValidationArguments) {
    return validateEgyptianNationalId(_args.value).message || "الرقم القومي غير صحيح";
  }
}

@ValidatorConstraint({ name: "IsEgyptianPhone", async: false })
class IsEgyptianPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments) {
    if (!value) return true; // optional
    return validateEgyptianPhone(value).valid;
  }
  defaultMessage(_args: ValidationArguments) {
    return validateEgyptianPhone(_args.value).message || "رقم الهاتف غير صحيح";
  }
}

export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty({ message: "الاسم الرباعي مطلوب" })
  @Validate(IsEgyptianFullNameConstraint)
  full_name: string;

  @IsString()
  @IsNotEmpty({ message: "الرقم القومي مطلوب" })
  @Validate(IsEgyptianNidConstraint)
  national_id: string;

  @IsOptional()
  @IsString()
  @Validate(IsEgyptianPhoneConstraint)
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: "كلمة المرور مطلوبة" })
  @Length(6, 100, { message: "كلمة المرور لازم تكون 6 أحرف على الأقل" })
  password: string;
}
