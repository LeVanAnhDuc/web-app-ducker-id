// libs
import Joi from "joi";
// types
import type {
  SubmitContactBody,
  MyContactsQuery
} from "@/modules/contact-admin/types";
// modules
import {
  CONTACT_PRIORITIES,
  CONTACT_STATUSES,
  ADMIN_CONTACTS_SORT_BY
} from "@/modules/contact-admin/constants";
// common
import { PAGINATION } from "@/common/pagination";
import { SORT_ORDER_VALUES } from "@/common/sort";
// validators
import {
  CONTACT_CONFIG,
  OBJECTID_PATTERN,
  SEARCH_MAX_LENGTH
} from "@/validators/constants";
// others
import { emailSchema } from "./base";

const PRIORITY_VALUES = Object.values(CONTACT_PRIORITIES);
const STATUS_VALUES = Object.values(CONTACT_STATUSES);

const ADMIN_SORT_BY_VALUES = ADMIN_CONTACTS_SORT_BY;

export const submitContactSchema: Joi.ObjectSchema<SubmitContactBody> =
  Joi.object({
    email: emailSchema.optional().allow("").messages({
      "string.email": "validation:email.invalid",
      "string.pattern.base": "validation:email.invalid"
    }),
    subject: Joi.string()
      .min(CONTACT_CONFIG.SUBJECT_MIN_LENGTH)
      .max(CONTACT_CONFIG.SUBJECT_MAX_LENGTH)
      .required()
      .messages({
        "string.empty": "contactAdmin:errors.subjectRequired",
        "string.min": "contactAdmin:errors.subjectTooShort",
        "string.max": "contactAdmin:errors.subjectTooLong",
        "any.required": "contactAdmin:errors.subjectRequired"
      }),
    message: Joi.string()
      .min(CONTACT_CONFIG.MESSAGE_MIN_LENGTH)
      .max(CONTACT_CONFIG.MESSAGE_MAX_LENGTH)
      .required()
      .messages({
        "string.empty": "contactAdmin:errors.messageRequired",
        "string.min": "contactAdmin:errors.messageTooShort",
        "string.max": "contactAdmin:errors.messageTooLong",
        "any.required": "contactAdmin:errors.messageRequired"
      })
  });

// ─── v2.0 Schemas ──────────────────────────────────────────────────────────

export const contactIdParamSchema = Joi.object({
  id: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
    "string.empty": "contactAdmin:errors.invalidId",
    "string.pattern.base": "contactAdmin:errors.invalidId",
    "any.required": "contactAdmin:errors.invalidId"
  })
});

export const updateContactStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...STATUS_VALUES)
    .required()
    .messages({
      "string.empty": "contactAdmin:errors.statusRequired",
      "any.only": "contactAdmin:errors.statusInvalid",
      "any.required": "contactAdmin:errors.statusRequired"
    })
});

export const adminListContactsQuerySchema = Joi.object({
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
    .messages({ "any.only": "validation:status.invalid" }),

  priority: Joi.string()
    .valid(...PRIORITY_VALUES)
    .optional()
    .messages({ "any.only": "validation:priority.invalid" }),

  email: Joi.string().trim().optional(),

  search: Joi.string()
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
    .valid(...ADMIN_SORT_BY_VALUES)
    .optional()
    .messages({ "any.only": "validation:sortBy.invalid" }),

  sortOrder: Joi.string()
    .valid(...SORT_ORDER_VALUES)
    .optional()
    .messages({ "any.only": "validation:sortOrder.invalid" })
})
  .custom((value, helpers) => {
    const { fromDate, toDate } = value;
    if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
      return helpers.error("date.range");
    }
    return value;
  })
  .messages({ "date.range": "validation:dateRange.invalid" });

// ─── MyContacts (user, owner-scoped) ────────────────────────────────────────

export const myContactsQuerySchema: Joi.ObjectSchema<MyContactsQuery> =
  Joi.object({
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
      .messages({ "any.only": "validation:status.invalid" }),

    search: Joi.string()
      .trim()
      .max(SEARCH_MAX_LENGTH)
      .optional()
      .messages({ "string.max": "validation:search.invalid" }),

    sortBy: Joi.string()
      .valid(...ADMIN_SORT_BY_VALUES)
      .optional()
      .messages({ "any.only": "validation:sortBy.invalid" }),

    sortOrder: Joi.string()
      .valid(...SORT_ORDER_VALUES)
      .optional()
      .messages({ "any.only": "validation:sortOrder.invalid" })
  });
