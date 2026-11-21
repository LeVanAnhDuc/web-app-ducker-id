// libs
import Joi from "joi";
// constants
import { FAVORITE_SORTS } from "@/modules/favorite/constants";
// validators
import { OBJECTID_PATTERN, SEARCH_MAX_LENGTH } from "@/validators/constants";

export const favoriteAppIdParamSchema = Joi.object({
  appId: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
    "string.empty": "favorite:validation.appId.required",
    "any.required": "favorite:validation.appId.required",
    "string.pattern.base": "favorite:validation.appId.invalid"
  })
});

export const listFavoritesQuerySchema = Joi.object({
  search: Joi.string().trim().max(SEARCH_MAX_LENGTH).optional().messages({
    "string.max": "validation:search.invalid"
  }),
  categoryId: Joi.string().pattern(OBJECTID_PATTERN).optional().messages({
    "string.pattern.base": "validation:categoryId.invalid"
  }),
  sort: Joi.string()
    .valid(...Object.values(FAVORITE_SORTS))
    .optional()
    .messages({
      "any.only": "favorite:validation.sort.invalid"
    })
});
