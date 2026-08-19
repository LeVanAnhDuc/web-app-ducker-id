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

const getDateOfBirthBounds = (): { minDate: Date; maxDate: Date } => {
  const now = new Date();
  const maxDate = new Date(now);
  maxDate.setFullYear(maxDate.getFullYear() - AGE_VALIDATION.MIN_AGE);
  const minDate = new Date(now);
  minDate.setFullYear(minDate.getFullYear() - AGE_VALIDATION.MAX_AGE);
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
  .min(getDateOfBirthBounds().minDate)
  .max(getDateOfBirthBounds().maxDate)
  .messages({
    "date.base": "validation:dateOfBirth.invalid",
    "date.min": "validation:dateOfBirth.tooOld",
    "date.max": "validation:dateOfBirth.tooYoung",
    "any.required": "validation:dateOfBirth.required"
  });
