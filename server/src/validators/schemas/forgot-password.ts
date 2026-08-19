// libs
import Joi from "joi";
// modules
import {
  FORGOT_PASSWORD_MAGIC_LINK_CONFIG,
  FORGOT_PASSWORD_RESET_TOKEN_CONFIG
} from "@/modules/forgot-password/constants";
// others
import { emailSchema, otpSchema, passwordSchema } from "./base";

export const fpOtpSendSchema = Joi.object({
  email: emailSchema.required()
});

export const fpOtpVerifySchema = Joi.object({
  email: emailSchema.required(),
  otp: otpSchema.required()
});

export const fpMagicLinkSendSchema = Joi.object({
  email: emailSchema.required()
});

export const fpMagicLinkVerifySchema = Joi.object({
  email: emailSchema.required(),
  token: Joi.string()
    .length(FORGOT_PASSWORD_MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2)
    .pattern(/^[a-f0-9]+$/)
    .required()
    .messages({
      "string.empty": "forgotPassword:validation.tokenRequired",
      "string.length": "forgotPassword:validation.tokenInvalid",
      "string.pattern.base": "forgotPassword:validation.tokenInvalid",
      "any.required": "forgotPassword:validation.tokenRequired"
    })
});

export const fpResetPasswordSchema = Joi.object({
  email: emailSchema.required(),
  resetToken: Joi.string()
    .length(FORGOT_PASSWORD_RESET_TOKEN_CONFIG.TOKEN_LENGTH * 2)
    .pattern(/^[a-f0-9]+$/)
    .required()
    .messages({
      "string.empty": "forgotPassword:validation.resetTokenRequired",
      "string.length": "forgotPassword:validation.resetTokenInvalid",
      "string.pattern.base": "forgotPassword:validation.resetTokenInvalid",
      "any.required": "forgotPassword:validation.resetTokenRequired"
    }),
  newPassword: passwordSchema.required()
});
