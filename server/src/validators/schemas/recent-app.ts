// libs
import Joi from "joi";
// types
import type {
  ListRecentAppsQuery,
  RecentAppIdParams
} from "@/modules/recent-app/types";
// common
import { PAGINATION } from "@/common/pagination";
// validators
import { OBJECTID_PATTERN, SEARCH_MAX_LENGTH } from "@/validators/constants";

export const recentAppIdParamSchema: Joi.ObjectSchema<RecentAppIdParams> =
  Joi.object({
    appId: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
      "string.empty": "recentApp:validation.appId.required",
      "any.required": "recentApp:validation.appId.required",
      "string.pattern.base": "recentApp:validation.appId.invalid"
    })
  });

export const listRecentAppsQuerySchema: Joi.ObjectSchema<ListRecentAppsQuery> =
  Joi.object({
    search: Joi.string().trim().max(SEARCH_MAX_LENGTH).optional().messages({
      "string.max": "validation:search.invalid"
    }),
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
      })
  });
