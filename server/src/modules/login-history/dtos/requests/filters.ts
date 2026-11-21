// libs
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
import {
  composeDecorators,
  IsIsoDateString,
  IsObjectId,
  Trim
} from "@/validators/decorators";

// Joi keyed only the rule each filter exists for; a blank or wrong-typed value
// shipped English, so it takes that same key.

/**
 * A free-text filter (country, city, os, browser, ip): trimmed before the
 * length check, so padding does not count toward the max.
 */
export const SearchText = (): PropertyDecorator =>
  composeDecorators(
    MaxLength(SEARCH_MAX_LENGTH, { message: "validation:search.invalid" }),
    IsNotEmpty({ message: "validation:search.invalid" }),
    IsString({ message: "validation:search.invalid" }),
    IsOptional(),
    Trim()
  );

export const ObjectIdFilter = (key: string): PropertyDecorator =>
  composeDecorators(
    IsObjectId(key),
    IsNotEmpty({ message: key }),
    IsString({ message: key }),
    IsOptional()
  );

/** One of a fixed set: Joi checks `.valid()` first, so blank is unknown too. */
export const OneOf = (
  values: readonly unknown[],
  key: string
): PropertyDecorator =>
  composeDecorators(
    IsIn(values, { message: key }),
    IsString({ message: key }),
    IsOptional()
  );

/**
 * Kept exactly as sent (Joi's `isoDate().raw()`): normalising "2026-10-04" to
 * its first millisecond would stop the filter reading it as the whole day.
 */
export const IsoDateFilter = (key: string): PropertyDecorator =>
  composeDecorators(
    IsIsoDateString({ message: key }),
    IsNotEmpty({ message: key }),
    IsString({ message: key }),
    IsOptional()
  );
