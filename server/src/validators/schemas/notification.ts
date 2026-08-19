// libs
import Joi from "joi";
// common
import { PAGINATION } from "@/common/pagination";
import { SORT_ORDER_VALUES } from "@/common/sort";
// validators
import { OBJECTID_PATTERN } from "@/validators/constants";

export const notificationListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    "number.base": "validation:page.invalid",
    "number.integer": "validation:page.invalid",
    "number.min": "validation:page.invalid"
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .optional()
    .messages({
      "number.base": "validation:limit.invalid",
      "number.integer": "validation:limit.invalid",
      "number.min": "validation:limit.invalid",
      "number.max": "validation:limit.invalid"
    }),
  isRead: Joi.boolean().optional().messages({
    "boolean.base": "validation:isRead.invalid"
  }),
  sortOrder: Joi.string()
    .valid(...SORT_ORDER_VALUES)
    .optional()
    .messages({ "any.only": "validation:sortOrder.invalid" })
});

export const notificationIdParamSchema = Joi.object({
  id: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
    "string.pattern.base": "validation:id.invalid",
    "any.required": "validation:id.invalid"
  })
});
