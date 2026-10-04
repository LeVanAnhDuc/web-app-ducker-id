// libs
import * as z from "zod";
// others
import CONSTANTS from "@/constants";
import { normalizeCategoryName, slugifyCategoryName } from "@/utils";

const { NAME_EN, NAME_VI } = CONSTANTS.FIELD_NAMES.ADMIN_CATEGORY_FIELD_NAMES;
const { NAME_MAX_LENGTH } = CONSTANTS.CATEGORY_LIMITS;

// Checked on the normalised value, the same string the server stores (DR-11).
const nameField = z
  .string()
  .refine((v) => normalizeCategoryName(v).length > 0, { message: "required" })
  .refine((v) => normalizeCategoryName(v).length <= NAME_MAX_LENGTH, {
    message: "maxLength"
  });

export const adminCategoryValidation = z.object({
  [NAME_EN]: nameField.refine(
    (v) =>
      normalizeCategoryName(v).length === 0 ||
      slugifyCategoryName(v).length > 0,
    { message: "noSlug" }
  ),
  [NAME_VI]: nameField
});
