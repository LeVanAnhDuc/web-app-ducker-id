// libs
import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  registerDecorator,
  ValidateIf
} from "class-validator";
// modules
import {
  normalizeCategoryName,
  slugifyCategoryName
} from "@/modules/category/category.helper";
import { CATEGORY_CONFIG } from "@/modules/category/constants";
// validators
import { composeDecorators } from "@/validators/decorators";

type NameField = "nameEn" | "nameVi";

/**
 * Normalising before validation means the length check, the service, the
 * unique index and the slug all see the same string: "Content" + a
 * zero-width space and " Content " are both "Content".
 */
const NormalizeCategoryName = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeCategoryName(value) : value
  );

// An English name with no letter or digit left after folding has no slug (DR-12).
const HasCategorySlug = (options: { message: string }): PropertyDecorator =>
  ((target, propertyKey) =>
    registerDecorator({
      name: "hasCategorySlug",
      target: target.constructor,
      propertyName: propertyKey as string,
      options,
      validator: {
        validate: (value: unknown) =>
          typeof value === "string" && slugifyCategoryName(value) !== ""
      }
    })) as PropertyDecorator;

// A wrong type or a name that normalises to nothing is "required", as in Joi.
const nameRules = (field: NameField, ...extra: PropertyDecorator[]) =>
  composeDecorators(
    MaxLength(CATEGORY_CONFIG.NAME_MAX_LENGTH, {
      message: `category:validation.${field}.maxLength`
    }),
    ...extra,
    IsNotEmpty({ message: `category:validation.${field}.required` }),
    IsString({ message: `category:validation.${field}.required` }),
    NormalizeCategoryName()
  );

export const NameEnRules = (): PropertyDecorator =>
  nameRules(
    "nameEn",
    HasCategorySlug({ message: "category:validation.nameEn.noSlug" })
  );

export const NameViRules = (): PropertyDecorator => nameRules("nameVi");

/** Skips a missing name only: Joi refuses `null`. */
export const UnlessMissing = (): PropertyDecorator =>
  ValidateIf((_object, value) => value !== undefined);
