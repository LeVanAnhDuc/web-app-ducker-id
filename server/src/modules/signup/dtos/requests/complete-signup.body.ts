// libs
import {
  Equals,
  IsBoolean,
  IsDate,
  IsDefined,
  IsNotEmpty,
  IsString,
  Length
} from "class-validator";
// types
import type { Gender } from "@/modules/user/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { SESSION_CONFIG } from "@/modules/signup/constants";
// validators
import {
  IsAppEmail,
  IsAppPassword,
  IsDateOfBirthNotTooOld,
  IsDateOfBirthNotTooYoung,
  IsFullName,
  IsGender,
  MatchesProperty,
  ToDate
} from "@/validators/decorators";

// Joi checks `.valid()` before the field's type and empty rules, so any
// present value that is not the expected one fails as that rule — rules
// below are listed so the same one is reported first.

export class CompleteSignupBodyDto {
  @ApiProperty({ example: "user@example.com" })
  @IsAppEmail()
  email!: string;

  @IsAppPassword()
  password!: string;

  @ApiProperty({ description: "Must equal `password`" })
  @IsString({ message: "signup:errors.passwordMismatch" })
  @MatchesProperty("password", { message: "signup:errors.passwordMismatch" })
  @IsDefined({
    message: ({ value }) =>
      value === null
        ? "signup:errors.passwordMismatch"
        : "signup:errors.confirmPasswordRequired"
  })
  confirmPassword!: string;

  @ApiProperty({ description: "Returned by /auth/signup/verify-otp" })
  @Length(SESSION_CONFIG.TOKEN_LENGTH * 2, SESSION_CONFIG.TOKEN_LENGTH * 2, {
    message: "signup:errors.sessionTokenInvalid"
  })
  @IsNotEmpty({ message: "signup:errors.sessionTokenRequired" })
  @IsString({ message: "signup:errors.sessionTokenInvalid" })
  @IsDefined({ message: "signup:errors.sessionTokenRequired" })
  sessionToken!: string;

  // Strict like Joi's `.strict()`: the string "true" is not converted. Joi
  // reports `any.only` before `boolean.base`, so a non-boolean shows the
  // "must accept" message, while `reason` still tells the two apart.
  @Equals(true, { message: "signup:errors.acceptTermsRequired" })
  @IsBoolean({ message: "signup:errors.acceptTermsRequired" })
  @IsDefined({ message: "signup:errors.acceptTermsRequired" })
  acceptTerms!: true;

  @ApiProperty({ example: "Nguyễn Văn A" })
  @IsFullName()
  fullName!: string;

  @IsGender()
  gender!: Gender;

  @ApiProperty({
    example: "1995-05-15",
    description: "Age between 13 and 120"
  })
  @IsDateOfBirthNotTooOld({ message: "validation:dateOfBirth.tooOld" })
  @IsDateOfBirthNotTooYoung({ message: "validation:dateOfBirth.tooYoung" })
  @IsDate({ message: "validation:dateOfBirth.invalid" })
  @IsDefined({
    message: ({ value }) =>
      value === null
        ? "validation:dateOfBirth.invalid"
        : "validation:dateOfBirth.required"
  })
  @ToDate()
  dateOfBirth!: Date;
}
