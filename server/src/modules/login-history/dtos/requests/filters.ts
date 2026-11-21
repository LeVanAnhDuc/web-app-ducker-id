// libs
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
// validators
import { composeDecorators, IsIsoDateString } from "@/validators/decorators";

// The login-history-only filter; search, id and one-of filters are shared ones
// from `@/validators/decorators`. A blank or wrong-typed value takes the rule's key.

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
