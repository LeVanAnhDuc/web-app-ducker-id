// libs
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
import { composeDecorators } from "./fields";
import { IsObjectId } from "./rules";
import { Trim } from "./transforms";

// Optional list-query filters. Joi keyed only the rule each filter exists for;
// a blank or wrong-typed value shipped English, so it takes that same key.

/**
 * Free text (search, country, ip…): trimmed before the length check, so
 * padding does not count toward the max.
 */
export const SearchFilter = (): PropertyDecorator =>
  composeDecorators(
    MaxLength(SEARCH_MAX_LENGTH, { message: "validation:search.invalid" }),
    IsNotEmpty({ message: "validation:search.invalid" }),
    IsString({ message: "validation:search.invalid" }),
    IsOptional(),
    Trim()
  );

/** An id filter whose every failure carries the one key. */
export const ObjectIdFilter = (key: string): PropertyDecorator =>
  composeDecorators(
    IsObjectId(key),
    IsNotEmpty({ message: key }),
    IsString({ message: key }),
    IsOptional()
  );
