// libs
import {
  IsDefined,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
// modules
import { GENDERS } from "@/modules/user/constants";
// validators
import {
  EMAIL_VALIDATION,
  FULLNAME_VALIDATION,
  NUMERIC_OTP_PATTERN,
  OTP_VALIDATION,
  PASSWORD_STRENGTH_PATTERN,
  PASSWORD_VALIDATION,
  SAFE_EMAIL_PATTERN,
  SAFE_FULLNAME_PATTERN
} from "@/validators/constants";
import { Lowercase, Trim } from "./transforms";

const GENDER_VALUES = Object.values(GENDERS);

/**
 * Reads like a stack of decorators written in source: the first one listed is
 * the top one. Decorators apply bottom-up, so the list is applied in reverse
 * and the last entry is the rule checked first.
 */
export const composeDecorators =
  (...decorators: PropertyDecorator[]): PropertyDecorator =>
  (target, propertyKey) => {
    for (const decorator of [...decorators].reverse()) {
      decorator(target, propertyKey);
    }
  };

// Each field is required, as every use of the Joi fragment is (`.required()`)
// — an `@IsOptional()` would not skip `@IsDefined`. Rules run bottom-up in
// Joi's order: type, then empty, then the rules as the Joi chain declares them. A wrong type had no key in Joi (it
// shipped English), so it takes the field's `.invalid` key, else `.required`.

export const IsAppEmail = (): PropertyDecorator =>
  composeDecorators(
    Matches(SAFE_EMAIL_PATTERN, { message: "validation:email.invalid" }),
    MaxLength(EMAIL_VALIDATION.MAX_LENGTH, {
      message: "validation:email.maxLength"
    }),
    MinLength(EMAIL_VALIDATION.MIN_LENGTH, {
      message: "validation:email.minLength"
    }),
    IsEmail({}, { message: "validation:email.invalid" }),
    IsNotEmpty({ message: "validation:email.required" }),
    IsString({ message: "validation:email.invalid" }),
    IsDefined({ message: "validation:email.required" }),
    Lowercase(),
    Trim()
  );

export const IsAppPassword = (): PropertyDecorator =>
  composeDecorators(
    Matches(PASSWORD_STRENGTH_PATTERN, {
      message: "validation:password.pattern"
    }),
    MaxLength(PASSWORD_VALIDATION.MAX_LENGTH, {
      message: "validation:password.maxLength"
    }),
    MinLength(PASSWORD_VALIDATION.MIN_LENGTH, {
      message: "validation:password.minLength"
    }),
    IsNotEmpty({ message: "validation:password.required" }),
    IsString({ message: "validation:password.required" }),
    IsDefined({ message: "validation:password.required" })
  );

export const IsOtp = (): PropertyDecorator =>
  composeDecorators(
    Matches(NUMERIC_OTP_PATTERN, { message: "validation:otp.digitsOnly" }),
    Length(OTP_VALIDATION.LENGTH, OTP_VALIDATION.LENGTH, {
      message: "validation:otp.length"
    }),
    IsNotEmpty({ message: "validation:otp.required" }),
    IsString({ message: "validation:otp.required" }),
    IsDefined({ message: "validation:otp.required" })
  );

export const IsFullName = (): PropertyDecorator =>
  composeDecorators(
    Matches(SAFE_FULLNAME_PATTERN, { message: "validation:fullName.invalid" }),
    MaxLength(FULLNAME_VALIDATION.MAX_LENGTH, {
      message: "validation:fullName.maxLength"
    }),
    MinLength(FULLNAME_VALIDATION.MIN_LENGTH, {
      message: "validation:fullName.minLength"
    }),
    IsNotEmpty({ message: "validation:fullName.required" }),
    IsString({ message: "validation:fullName.invalid" }),
    IsDefined({ message: "validation:fullName.required" })
  );

export const IsGender = (): PropertyDecorator =>
  composeDecorators(
    IsIn(GENDER_VALUES, { message: "validation:gender.invalid" }),
    IsString({ message: "validation:gender.invalid" }),
    // Joi checks `.valid()` before its empty and type checks, so `""` and
    // `null` are an unknown gender rather than a missing one.
    IsDefined({
      message: ({ value }) =>
        value === null
          ? "validation:gender.invalid"
          : "validation:gender.required"
    })
  );
