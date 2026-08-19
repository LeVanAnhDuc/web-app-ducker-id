// libs
import Joi from "joi";
// others
import { emailSchema } from "./base";

export const unlockRequestSchema = Joi.object({
  email: emailSchema.required()
});

export const unlockVerifySchema = Joi.object({
  email: emailSchema.required(),
  tempPassword: Joi.string().min(12).required().messages({
    "string.empty": "unlockAccount:validation.tempPasswordRequired",
    "string.min": "unlockAccount:validation.tempPasswordTooShort",
    "any.required": "unlockAccount:validation.tempPasswordRequired"
  })
});
