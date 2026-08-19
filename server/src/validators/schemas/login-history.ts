// libs
import Joi from "joi";
// modules
import {
  LOGIN_STATUSES,
  LOGIN_METHODS,
  DEVICE_TYPES,
  CLIENT_TYPES,
  LOGIN_HISTORY_SORT_BY_USER,
  LOGIN_HISTORY_SORT_BY_ADMIN
} from "@/modules/login-history/constants";
// common
import { PAGINATION } from "@/common/pagination";
import { SORT_ORDER_VALUES } from "@/common/sort";
// validators
import { OBJECTID_PATTERN, SEARCH_MAX_LENGTH } from "@/validators/constants";

const STATUS_VALUES = Object.values(LOGIN_STATUSES);
const METHOD_VALUES = Object.values(LOGIN_METHODS);
const DEVICE_TYPE_VALUES = Object.values(DEVICE_TYPES);
const CLIENT_TYPE_VALUES = Object.values(CLIENT_TYPES);

const SORT_BY_USER_VALUES = LOGIN_HISTORY_SORT_BY_USER;
const SORT_BY_ADMIN_VALUES = LOGIN_HISTORY_SORT_BY_ADMIN;

export const loginHistoryQuerySchema = Joi.object({
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

  status: Joi.string()
    .valid(...STATUS_VALUES)
    .optional()
    .messages({
      "any.only": "validation:status.invalid"
    }),

  method: Joi.string()
    .valid(...METHOD_VALUES)
    .optional()
    .messages({
      "any.only": "validation:method.invalid"
    }),

  deviceType: Joi.string()
    .valid(...DEVICE_TYPE_VALUES)
    .optional()
    .messages({
      "any.only": "validation:deviceType.invalid"
    }),

  clientType: Joi.string()
    .valid(...CLIENT_TYPE_VALUES)
    .optional()
    .messages({
      "any.only": "validation:clientType.invalid"
    }),

  country: Joi.string()
    .trim()
    .max(SEARCH_MAX_LENGTH)
    .optional()
    .messages({ "string.max": "validation:search.invalid" }),

  city: Joi.string()
    .trim()
    .max(SEARCH_MAX_LENGTH)
    .optional()
    .messages({ "string.max": "validation:search.invalid" }),

  os: Joi.string()
    .trim()
    .max(SEARCH_MAX_LENGTH)
    .optional()
    .messages({ "string.max": "validation:search.invalid" }),

  browser: Joi.string()
    .trim()
    .max(SEARCH_MAX_LENGTH)
    .optional()
    .messages({ "string.max": "validation:search.invalid" }),

  fromDate: Joi.string().isoDate().optional().messages({
    "string.isoDate": "validation:fromDate.invalid"
  }),

  toDate: Joi.string().isoDate().optional().messages({
    "string.isoDate": "validation:toDate.invalid"
  }),

  sortBy: Joi.string()
    .valid(...SORT_BY_USER_VALUES)
    .optional()
    .messages({
      "any.only": "validation:sortBy.invalid"
    }),

  sortOrder: Joi.string()
    .valid(...SORT_ORDER_VALUES)
    .optional()
    .messages({
      "any.only": "validation:sortOrder.invalid"
    })
})
  .custom((value, helpers) => {
    const { fromDate, toDate } = value;
    if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
      return helpers.error("date.range");
    }
    return value;
  })
  .messages({
    "date.range": "validation:dateRange.invalid"
  });

export const loginHistoryAdminQuerySchema = loginHistoryQuerySchema.keys({
  userId: Joi.string().pattern(OBJECTID_PATTERN).optional().messages({
    "string.pattern.base": "validation:userId.invalid"
  }),

  ip: Joi.string()
    .trim()
    .max(SEARCH_MAX_LENGTH)
    .optional()
    .messages({ "string.max": "validation:search.invalid" }),

  sortBy: Joi.string()
    .valid(...SORT_BY_ADMIN_VALUES)
    .optional()
    .messages({
      "any.only": "validation:sortBy.invalid"
    })
});

export const loginHistoryIdParamSchema = Joi.object({
  id: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
    "string.empty": "loginHistory:errors.invalidId",
    "string.pattern.base": "loginHistory:errors.invalidId",
    "any.required": "loginHistory:errors.invalidId"
  })
});
