// libs
import Joi from "joi";
// modules
import { MAGIC_LINK_CONFIG } from "@/modules/login/constants";
// others
import { emailSchema, otpSchema } from "./base";

export const loginSchema = Joi.object({
  email: emailSchema.required(),
  password: Joi.string().required().messages({
    "string.empty": "validation:password.required",
    "any.required": "validation:password.required"
  })
});

export const otpSendSchema = Joi.object({
  email: emailSchema.required()
});

export const otpVerifySchema = Joi.object({
  email: emailSchema.required(),
  otp: otpSchema.required()
});

export const magicLinkSendSchema = Joi.object({
  email: emailSchema.required()
});

export const magicLinkVerifySchema = Joi.object({
  email: emailSchema.required(),
  token: Joi.string()
    .length(MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2)
    .pattern(/^[a-f0-9]+$/)
    .required()
    .messages({
      "string.empty": "login:validation.tokenRequired",
      "string.length": "login:validation.tokenInvalid",
      "string.pattern.base": "login:validation.tokenInvalid",
      "any.required": "login:validation.tokenRequired"
    })
});
