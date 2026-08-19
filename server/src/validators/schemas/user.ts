// libs
import Joi from "joi";
// types
import type { UpdateProfileData } from "@/modules/user/types";
// modules
import {
  GENDERS,
  ADMIN_USER_STATUS_FILTERS,
  ADMIN_USERS_SORT_BY
} from "@/modules/user/constants";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// common
import { PAGINATION } from "@/common/pagination";
import { SORT_ORDER_VALUES } from "@/common/sort";
// validators
import {
  FULLNAME_VALIDATION,
  SAFE_FULLNAME_PATTERN,
  SAFE_ADDRESS_PATTERN,
  SEARCH_MAX_LENGTH
} from "@/validators/constants";

const GENDER_VALUES = Object.values(GENDERS);
const ADDRESS_MAX_LENGTH = 500;

export const updateProfileSchema: Joi.ObjectSchema<UpdateProfileData> =
  Joi.object({
    fullName: Joi.string()
      .min(FULLNAME_VALIDATION.MIN_LENGTH)
      .max(FULLNAME_VALIDATION.MAX_LENGTH)
      .pattern(SAFE_FULLNAME_PATTERN)
      .optional()
      .messages({
        "string.empty": "validation:fullName.required",
        "string.min": "validation:fullName.minLength",
        "string.max": "validation:fullName.maxLength",
        "string.pattern.base": "validation:fullName.invalid"
      }),

    phone: Joi.string()
      .min(1)
      .max(20)
      .pattern(/^[\d\s()+-]+$/)
      .optional()
      .messages({
        "string.empty": "validation:phone.invalid",
        "string.max": "validation:phone.invalid",
        "string.pattern.base": "validation:phone.invalid"
      }),

    address: Joi.string()
      .max(ADDRESS_MAX_LENGTH)
      .pattern(SAFE_ADDRESS_PATTERN)
      .optional()
      .messages({
        "string.max": "validation:address.tooLong",
        "string.pattern.base": "validation:address.invalid"
      }),

    dateOfBirth: Joi.string()
      .isoDate()
      .custom((value, helpers) => {
        const date = new Date(value);
        const now = new Date();
        const hundredYearsAgo = new Date();
        hundredYearsAgo.setFullYear(now.getFullYear() - 100);

        if (date > now) {
          return helpers.error("date.future");
        }
        if (date < hundredYearsAgo) {
          return helpers.error("date.tooOld");
        }

        return value;
      })
      .optional()
      .messages({
        "string.isoDate": "validation:dateOfBirth.invalid",
        "date.future": "validation:dateOfBirth.tooYoung",
        "date.tooOld": "validation:dateOfBirth.tooOld"
      }),

    gender: Joi.string()
      .valid(...GENDER_VALUES)
      .optional()
      .messages({
        "any.only": "validation:gender.invalid"
      })
  });

export const getPublicProfileSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .required()
    .messages({
      "string.empty": "user:errors.invalidId",
      "string.pattern.base": "user:errors.invalidId",
      "any.required": "user:errors.invalidId"
    })
});

export const adminUserIdParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .required()
    .messages({
      "string.empty": "user:errors.invalidId",
      "string.pattern.base": "user:errors.invalidId",
      "any.required": "user:errors.invalidId"
    })
});

const ROLE_VALUES = Object.values(AUTHENTICATION_ROLES);
const STATUS_FILTER_VALUES = Object.values(ADMIN_USER_STATUS_FILTERS);

export const adminUsersQuerySchema = Joi.object({
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

  role: Joi.string()
    .valid(...ROLE_VALUES)
    .optional()
    .messages({ "any.only": "validation:role.invalid" }),

  status: Joi.string()
    .valid(...STATUS_FILTER_VALUES)
    .optional()
    .messages({ "any.only": "validation:status.invalid" }),

  sortBy: Joi.string()
    .valid(...ADMIN_USERS_SORT_BY)
    .optional()
    .messages({ "any.only": "validation:sortBy.invalid" }),

  sortOrder: Joi.string()
    .valid(...SORT_ORDER_VALUES)
    .optional()
    .messages({ "any.only": "validation:sortOrder.invalid" })
});
