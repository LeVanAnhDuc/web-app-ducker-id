// libs
import Joi from "joi";
// types
import type {
  CategoryIdParams,
  CreateCategoryBody,
  DeleteCategoryBody,
  MoveCategoryBody,
  UpdateCategoryBody
} from "@/modules/category/types";
// modules
import {
  normalizeCategoryName,
  slugifyCategoryName
} from "@/modules/category/category.helper";
import {
  CATEGORY_CONFIG,
  CATEGORY_MOVE_DIRECTIONS
} from "@/modules/category/constants";
// validators
import { OBJECTID_PATTERN } from "@/validators/constants";

type NameField = "nameEn" | "nameVi";

/**
 * Normalising inside the schema means the service, the unique index and the
 * slug all see the same string: "Content" + a zero-width space and " Content " are "Content".
 * A name.en with no letter or digit left after folding has no slug (DR-12).
 */
const nameSchema = (field: NameField) =>
  Joi.string()
    .custom((value: string, helpers) => {
      const normalized = normalizeCategoryName(value);
      if (!normalized) return helpers.error("string.empty");
      if (field === "nameEn" && !slugifyCategoryName(normalized)) {
        return helpers.error("any.invalid");
      }
      return normalized;
    })
    .max(CATEGORY_CONFIG.NAME_MAX_LENGTH)
    .messages({
      "string.base": `category:validation.${field}.required`,
      "string.empty": `category:validation.${field}.required`,
      "any.required": `category:validation.${field}.required`,
      "string.max": `category:validation.${field}.maxLength`,
      "any.invalid": `category:validation.${field}.noSlug`
    });

const objectId = (key: string) =>
  Joi.string()
    .pattern(OBJECTID_PATTERN)
    .required()
    .messages({
      "string.base": `category:validation.${key}.invalid`,
      "string.empty": `category:validation.${key}.invalid`,
      "any.required": `category:validation.${key}.invalid`,
      "string.pattern.base": `category:validation.${key}.invalid`
    });

export const createCategoryBodySchema: Joi.ObjectSchema<CreateCategoryBody> =
  Joi.object({
    name: Joi.object({
      en: nameSchema("nameEn").required(),
      vi: nameSchema("nameVi").required()
    })
      .required()
      .messages({
        "any.required": "category:validation.nameEn.required",
        "object.base": "category:validation.nameEn.required"
      })
  });

export const updateCategoryBodySchema: Joi.ObjectSchema<UpdateCategoryBody> =
  Joi.object({
    name: Joi.object({
      en: nameSchema("nameEn"),
      vi: nameSchema("nameVi")
    })
      .min(1)
      .required()
      .messages({
        "any.required": "category:validation.body.empty",
        "object.base": "category:validation.body.empty",
        "object.min": "category:validation.body.empty"
      })
  });

export const moveCategoryBodySchema: Joi.ObjectSchema<MoveCategoryBody> =
  Joi.object({
    direction: Joi.string()
      .valid(...Object.values(CATEGORY_MOVE_DIRECTIONS))
      .required()
      .messages({
        "any.only": "category:validation.direction.invalid",
        "any.required": "category:validation.direction.invalid",
        "string.base": "category:validation.direction.invalid"
      })
  });

export const deleteCategoryBodySchema: Joi.ObjectSchema<DeleteCategoryBody> =
  Joi.object({
    reassignments: Joi.array()
      .items(
        Joi.object({
          appId: objectId("appId"),
          categoryId: objectId("targetId")
        })
      )
      .unique("appId")
      .max(CATEGORY_CONFIG.MAX_REASSIGNMENTS)
      .default([])
      .messages({
        "array.base": "category:validation.reassignments.invalid",
        "array.unique": "category:validation.reassignments.duplicateApp",
        "array.max": "category:validation.reassignments.tooMany"
      })
  }).default();

export const categoryIdParamSchema: Joi.ObjectSchema<CategoryIdParams> =
  Joi.object({
    id: objectId("id")
  });
