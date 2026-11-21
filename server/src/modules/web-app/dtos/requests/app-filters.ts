// libs
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
import { composeDecorators, IsObjectId, Trim } from "@/validators/decorators";

// Both app lists filter by search text and category the same way.

// Trimmed before the length check, so padding does not count toward the max.
export const SearchFilter = (): PropertyDecorator =>
  composeDecorators(
    MaxLength(SEARCH_MAX_LENGTH, { message: "validation:search.invalid" }),
    IsNotEmpty({ message: "validation:search.invalid" }),
    IsString({ message: "validation:search.invalid" }),
    IsOptional(),
    Trim()
  );

export const CategoryIdFilter = (): PropertyDecorator =>
  composeDecorators(
    IsObjectId("validation:categoryId.invalid"),
    IsNotEmpty({ message: "validation:categoryId.invalid" }),
    IsString({ message: "validation:categoryId.invalid" }),
    IsOptional()
  );
