// libs
import Joi from "joi";
// types
import type {
  EntitlementMatrixQuery,
  UpdateEntitlementsBody
} from "@/modules/entitlement/types";
// modules
import { ENTITLEMENT_LIMITS } from "@/modules/entitlement/constants";
// validators
import { OBJECTID_PATTERN } from "@/validators/constants";

const objectId = (key: string) =>
  Joi.string()
    .pattern(OBJECTID_PATTERN)
    .required()
    .messages({
      "string.base": `entitlement:validation.${key}.invalid`,
      "string.empty": `entitlement:validation.${key}.invalid`,
      "any.required": `entitlement:validation.${key}.invalid`,
      "string.pattern.base": `entitlement:validation.${key}.invalid`
    });

/** `?userIds=a,b` arrives as one string; split it before validating each id. */
const commaList = Joi.extend({
  type: "commaList",
  base: Joi.array(),
  coerce: {
    from: "string",
    method: (value: string) => ({
      value: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    })
  }
});

export const entitlementMatrixQuerySchema: Joi.ObjectSchema<EntitlementMatrixQuery> =
  Joi.object({
    userIds: commaList
      .commaList()
      .items(objectId("userId"))
      .min(1)
      .max(ENTITLEMENT_LIMITS.MAX_USERS_PER_QUERY)
      .unique()
      .required()
      .messages({
        "array.base": "entitlement:validation.userIds.required",
        "any.required": "entitlement:validation.userIds.required",
        "array.min": "entitlement:validation.userIds.required",
        "array.includesRequiredUnknowns":
          "entitlement:validation.userIds.required",
        "array.max": "entitlement:validation.userIds.tooMany",
        "array.unique": "entitlement:validation.userIds.duplicate"
      })
  });

export const updateEntitlementsBodySchema: Joi.ObjectSchema<UpdateEntitlementsBody> =
  Joi.object({
    changes: Joi.array()
      .items(
        Joi.object({
          userId: objectId("userId"),
          appId: objectId("appId"),
          granted: Joi.boolean().strict().required().messages({
            "boolean.base": "entitlement:validation.granted.invalid",
            "any.required": "entitlement:validation.granted.invalid"
          })
        })
      )
      .min(1)
      .max(ENTITLEMENT_LIMITS.MAX_CHANGES)
      .unique(
        (
          a: { userId: string; appId: string },
          b: { userId: string; appId: string }
        ) => a.userId === b.userId && a.appId === b.appId
      )
      .required()
      .messages({
        "array.base": "entitlement:validation.changes.required",
        "any.required": "entitlement:validation.changes.required",
        "array.min": "entitlement:validation.changes.required",
        "array.max": "entitlement:validation.changes.tooMany",
        "array.unique": "entitlement:validation.changes.duplicate"
      })
  });
