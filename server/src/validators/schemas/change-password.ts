// libs
import Joi from "joi";
// others
import { passwordSchema } from "./base";

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "changePassword:validation.currentPasswordRequired",
    "any.required": "changePassword:validation.currentPasswordRequired"
  }),
  newPassword: passwordSchema.required(),
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref("newPassword"))
    .messages({
      "any.only": "changePassword:validation.confirmMismatch",
      "string.empty": "changePassword:validation.confirmRequired",
      "any.required": "changePassword:validation.confirmRequired"
    })
});
