// libs
import Joi from "joi";
// modules
import { SESSION_CONFIG } from "@/modules/signup/constants";
// others
import {
  emailSchema,
  passwordSchema,
  otpSchema,
  fullNameSchema,
  genderSchema,
  dateOfBirthSchema
} from "./base";

export const sendOtpSchema = Joi.object({
  email: emailSchema.required()
});

export const resendOtpSchema = Joi.object({
  email: emailSchema.required()
});

export const verifyOtpSchema = Joi.object({
  email: emailSchema.required(),
  otp: otpSchema.required()
});

export const completeSignupSchema = Joi.object({
  email: emailSchema.required(),
  password: passwordSchema.required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "string.empty": "signup:errors.confirmPasswordRequired",
    "any.required": "signup:errors.confirmPasswordRequired",
    "any.only": "signup:errors.passwordMismatch"
  }),
  sessionToken: Joi.string()
    .length(SESSION_CONFIG.TOKEN_LENGTH * 2)
    .required()
    .messages({
      "string.empty": "signup:errors.sessionTokenRequired",
      "string.length": "signup:errors.sessionTokenInvalid",
      "any.required": "signup:errors.sessionTokenRequired"
    }),
  acceptTerms: Joi.boolean().strict().valid(true).required().messages({
    "boolean.base": "signup:errors.acceptTermsInvalid",
    "any.required": "signup:errors.acceptTermsRequired",
    "any.only": "signup:errors.acceptTermsRequired"
  }),
  fullName: fullNameSchema.required(),
  gender: genderSchema.required(),
  dateOfBirth: dateOfBirthSchema.required()
});

export const checkEmailSchema = Joi.object({
  email: emailSchema.required()
});
