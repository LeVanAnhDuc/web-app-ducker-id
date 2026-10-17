// libs
import Joi from "joi";
// modules
import { GENDERS } from "@/modules/user/constants";
// validators
import {
  AGE_VALIDATION,
  FULLNAME_VALIDATION,
  SAFE_FULLNAME_PATTERN,
  EMAIL_VALIDATION,
  NUMERIC_OTP_PATTERN,
  OTP_VALIDATION,
  PASSWORD_STRENGTH_PATTERN,
  PASSWORD_VALIDATION,
  SAFE_EMAIL_PATTERN
} from "@/validators/constants";

const GENDER_VALUES = Object.values(GENDERS);

const HOUR_MS = 3_600_000;

/**
 * Age limits in calendar days. A `YYYY-MM-DD` birth date arrives as UTC
 * midnight, while "today" depends on where the user is (UTC-12 … UTC+14), so
 * the bounds use the latest and earliest calendar day it can be anywhere:
 * someone's 13th birthday is accepted from the first time zone it starts in.
 * Computed per call — a bound built once at boot goes stale while the server runs.
 */
export const getDateOfBirthBounds = (
  now: Date = new Date()
): {
  minDate: Date;
  maxDate: Date;
} => {
  const latestToday = new Date(now.getTime() + 14 * HOUR_MS);
  const earliestToday = new Date(now.getTime() - 12 * HOUR_MS);
  const maxDate = new Date(
    Date.UTC(
      latestToday.getUTCFullYear() - AGE_VALIDATION.MIN_AGE,
      latestToday.getUTCMonth(),
      latestToday.getUTCDate()
    )
  );
  const minDate = new Date(
    Date.UTC(
      earliestToday.getUTCFullYear() - AGE_VALIDATION.MAX_AGE,
      earliestToday.getUTCMonth(),
      earliestToday.getUTCDate()
    )
  );
  return { minDate, maxDate };
};

export const emailSchema = Joi.string()
  .trim()
  .lowercase()
  .email()
  .min(EMAIL_VALIDATION.MIN_LENGTH)
  .max(EMAIL_VALIDATION.MAX_LENGTH)
  .pattern(SAFE_EMAIL_PATTERN)
  .messages({
    "string.email": "validation:email.invalid",
    "string.empty": "validation:email.required",
    "string.min": "validation:email.minLength",
    "string.max": "validation:email.maxLength",
    "string.pattern.base": "validation:email.invalid",
    "any.required": "validation:email.required"
  });

export const passwordSchema = Joi.string()
  .min(PASSWORD_VALIDATION.MIN_LENGTH)
  .max(PASSWORD_VALIDATION.MAX_LENGTH)
  .pattern(PASSWORD_STRENGTH_PATTERN)
  .messages({
    "string.empty": "validation:password.required",
    "string.min": "validation:password.minLength",
    "string.max": "validation:password.maxLength",
    "string.pattern.base": "validation:password.pattern",
    "any.required": "validation:password.required"
  });

export const otpSchema = Joi.string()
  .length(OTP_VALIDATION.LENGTH)
  .pattern(NUMERIC_OTP_PATTERN)
  .messages({
    "string.empty": "validation:otp.required",
    "string.length": "validation:otp.length",
    "string.pattern.base": "validation:otp.digitsOnly",
    "any.required": "validation:otp.required"
  });

export const fullNameSchema = Joi.string()
  .min(FULLNAME_VALIDATION.MIN_LENGTH)
  .max(FULLNAME_VALIDATION.MAX_LENGTH)
  .pattern(SAFE_FULLNAME_PATTERN)
  .messages({
    "string.empty": "validation:fullName.required",
    "string.min": "validation:fullName.minLength",
    "string.max": "validation:fullName.maxLength",
    "string.pattern.base": "validation:fullName.invalid",
    "any.required": "validation:fullName.required"
  });

export const genderSchema = Joi.string()
  .valid(...GENDER_VALUES)
  .messages({
    "string.empty": "validation:gender.required",
    "any.required": "validation:gender.required",
    "any.only": "validation:gender.invalid"
  });

export const dateOfBirthSchema = Joi.date()
  .custom((value: Date, helpers) => {
    const { minDate, maxDate } = getDateOfBirthBounds();
    if (value > maxDate) return helpers.error("date.max", { limit: maxDate });
    if (value < minDate) return helpers.error("date.min", { limit: minDate });
    return value;
  })
  .messages({
    "date.base": "validation:dateOfBirth.invalid",
    "date.min": "validation:dateOfBirth.tooOld",
    "date.max": "validation:dateOfBirth.tooYoung",
    "any.required": "validation:dateOfBirth.required"
  });
