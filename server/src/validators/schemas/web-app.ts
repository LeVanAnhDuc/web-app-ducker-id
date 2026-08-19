// libs
import Joi from "joi";
// types
import type {
  AdminAppsQuery,
  AdminAppCreateBody,
  AdminAppUpdateBody,
  AdminAppIdParams,
  UserAppsQuery
} from "@/modules/web-app/types";
// modules
import { WEB_APP_STATUS_PUBLIC } from "@/modules/web-app/constants";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// common
import { PAGINATION } from "@/common/pagination";
// validators
import { OBJECTID_PATTERN, SEARCH_MAX_LENGTH } from "@/validators/constants";

const STATUS_VALUES = Object.values(WEB_APP_STATUS_PUBLIC);
const ROLE_VALUES = Object.values(AUTHENTICATION_ROLES);
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const URL_PATTERN = /^https?:\/\/.+/i;

const NAME = { MIN: 2, MAX: 64 };
const DISPLAY_NAME = { MIN: 2, MAX: 80 };
const DESCRIPTION_MAX = 500;
const URL_MAX = 2000;
const MAX_REDIRECT_URIS = 20;

export const adminListAppsQuerySchema: Joi.ObjectSchema<AdminAppsQuery> =
  Joi.object({
    search: Joi.string()
      .trim()
      .max(SEARCH_MAX_LENGTH)
      .optional()
      .messages({ "string.max": "validation:search.invalid" }),

    status: Joi.string()
      .valid(...STATUS_VALUES)
      .optional()
      .messages({ "any.only": "validation:status.invalid" }),

    categoryId: Joi.string().pattern(OBJECTID_PATTERN).optional().messages({
      "string.pattern.base": "validation:categoryId.invalid"
    })
  });

export const listAppsQuerySchema: Joi.ObjectSchema<UserAppsQuery> = Joi.object({
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
  search: Joi.string()
    .trim()
    .max(SEARCH_MAX_LENGTH)
    .optional()
    .messages({ "string.max": "validation:search.invalid" }),
  categoryId: Joi.string().pattern(OBJECTID_PATTERN).optional().messages({
    "string.pattern.base": "validation:categoryId.invalid"
  })
});

export const adminCreateAppBodySchema: Joi.ObjectSchema<AdminAppCreateBody> =
  Joi.object({
    name: Joi.string()
      .trim()
      .lowercase()
      .min(NAME.MIN)
      .max(NAME.MAX)
      .pattern(NAME_PATTERN)
      .required()
      .messages({
        "string.empty": "webApp:validation.name.required",
        "any.required": "webApp:validation.name.required",
        "string.min": "webApp:validation.name.minLength",
        "string.max": "webApp:validation.name.maxLength",
        "string.pattern.base": "webApp:validation.name.invalid"
      }),
    displayName: Joi.string()
      .trim()
      .min(DISPLAY_NAME.MIN)
      .max(DISPLAY_NAME.MAX)
      .required()
      .messages({
        "string.empty": "webApp:validation.displayName.required",
        "any.required": "webApp:validation.displayName.required",
        "string.min": "webApp:validation.displayName.minLength",
        "string.max": "webApp:validation.displayName.maxLength"
      }),
    description: Joi.string()
      .trim()
      .max(DESCRIPTION_MAX)
      .allow("")
      .optional()
      .messages({ "string.max": "webApp:validation.description.maxLength" }),
    iconUrl: Joi.string()
      .trim()
      .max(URL_MAX)
      .pattern(URL_PATTERN)
      .allow("")
      .optional()
      .messages({
        "string.max": "webApp:validation.iconUrl.maxLength",
        "string.pattern.base": "webApp:validation.iconUrl.invalid"
      }),
    homeUrl: Joi.string()
      .trim()
      .max(URL_MAX)
      .pattern(URL_PATTERN)
      .required()
      .messages({
        "string.empty": "webApp:validation.homeUrl.required",
        "any.required": "webApp:validation.homeUrl.required",
        "string.max": "webApp:validation.homeUrl.maxLength",
        "string.pattern.base": "webApp:validation.homeUrl.invalid"
      }),
    categoryId: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
      "string.empty": "webApp:validation.categoryId.required",
      "any.required": "webApp:validation.categoryId.required",
      "string.pattern.base": "webApp:validation.categoryId.invalid"
    }),
    status: Joi.string()
      .valid(...STATUS_VALUES)
      .required()
      .messages({
        "any.only": "webApp:validation.status.invalid",
        "any.required": "webApp:validation.status.invalid"
      }),
    requiredRoles: Joi.array()
      .items(Joi.string().valid(...ROLE_VALUES))
      .min(1)
      .required()
      .messages({
        "array.min": "webApp:validation.requiredRoles.required",
        "any.required": "webApp:validation.requiredRoles.required",
        "any.only": "webApp:validation.requiredRoles.invalid"
      }),
    redirectUris: Joi.array()
      .items(Joi.string().trim().max(URL_MAX).pattern(URL_PATTERN))
      .min(1)
      .max(MAX_REDIRECT_URIS)
      .required()
      .messages({
        "array.min": "webApp:validation.redirectUris.required",
        "array.max": "webApp:validation.redirectUris.maxItems",
        "any.required": "webApp:validation.redirectUris.required",
        "string.pattern.base": "webApp:validation.redirectUris.invalid"
      })
  });

export const adminAppIdParamSchema: Joi.ObjectSchema<AdminAppIdParams> =
  Joi.object({
    id: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
      "string.empty": "webApp:validation.id.required",
      "any.required": "webApp:validation.id.required",
      "string.pattern.base": "webApp:validation.id.invalid"
    })
  });

export const adminUpdateAppBodySchema = adminCreateAppBodySchema
  .fork(
    [
      "name",
      "displayName",
      "homeUrl",
      "categoryId",
      "status",
      "requiredRoles",
      "redirectUris"
    ],
    (schema) => schema.optional()
  )
  .min(1)
  .messages({
    "object.min": "webApp:validation.body.empty"
  }) as Joi.ObjectSchema<AdminAppUpdateBody>;
