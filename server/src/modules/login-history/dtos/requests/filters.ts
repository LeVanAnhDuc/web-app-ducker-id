// libs
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
// validators
import { composeDecorators, IsIsoDateString } from "@/validators/decorators";

// The login-history-only filters; search and id filters are shared ones from
// `@/validators/decorators`. A blank or wrong-typed value takes the rule's key.

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
