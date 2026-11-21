// libs
import { Exclude } from "class-transformer";
import { registerDecorator } from "class-validator";
// types
import type { ValidationArguments, ValidationOptions } from "class-validator";
// modules
import { isValidRedirectUri } from "@/modules/oauth/helpers";
// validators
import { OBJECTID_PATTERN } from "@/validators/constants";
import { getDateOfBirthBounds } from "@/validators/date-of-birth";
import { isSupportedTimeZone } from "@/validators/utils";

type Check = (value: unknown, args: ValidationArguments) => boolean;

const rule =
  (
    name: string,
    validate: Check,
    options?: ValidationOptions,
    constraints?: unknown[]
  ): PropertyDecorator =>
  (target, propertyKey) =>
    registerDecorator({
      name,
      target: target.constructor,
      propertyName: propertyKey as string,
      constraints,
      options,
      validator: { validate }
    });

const toDate = (value: unknown): Date | null => {
  if (!(value instanceof Date) && typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const IsObjectId = (
  key: string,
  options?: ValidationOptions
): PropertyDecorator =>
  rule(
    "isObjectId",
    (value) => typeof value === "string" && OBJECTID_PATTERN.test(value),
    { ...options, message: key }
  );

export const MatchesProperty = (
  property: string,
  options?: ValidationOptions
): PropertyDecorator =>
  rule(
    "matchesProperty",
    (value, args) =>
      value === (args.object as Record<string, unknown>)[property],
    options,
    [property]
  );

// Only an inverted range fails: a missing or unparsable bound is left to the
// field's own rules, as the Joi object-level check did.
export const IsOnOrAfter = (
  property: string,
  options?: ValidationOptions
): PropertyDecorator =>
  rule(
    "isOnOrAfter",
    (value, args) => {
      const from = toDate((args.object as Record<string, unknown>)[property]);
      const to = toDate(value);
      return !from || !to || to >= from;
    },
    options,
    [property]
  );

export const IsSupportedTimeZone = (
  options?: ValidationOptions
): PropertyDecorator =>
  rule(
    "isSupportedTimeZone",
    (value) => typeof value === "string" && isSupportedTimeZone(value),
    options
  );

export const IsRedirectUri = (options?: ValidationOptions): PropertyDecorator =>
  rule(
    "isRedirectUri",
    (value) => typeof value === "string" && isValidRedirectUri(value),
    options
  );

// An unparsable date passes so the field's type rule reports it, and the
// bounds are read per call so they move with the clock.
export const IsDateOfBirthNotTooYoung = (
  options?: ValidationOptions
): PropertyDecorator =>
  rule(
    "isDateOfBirthNotTooYoung",
    (value) => {
      const date = toDate(value);
      return !date || date <= getDateOfBirthBounds().maxDate;
    },
    options
  );

export const IsDateOfBirthNotTooOld = (
  options?: ValidationOptions
): PropertyDecorator =>
  rule(
    "isDateOfBirthNotTooOld",
    (value) => {
      const date = toDate(value);
      return !date || date >= getDateOfBirthBounds().minDate;
    },
    options
  );

// class-validator has no class-level rules, so the check hangs off a
// property no client can set: `@Exclude` keeps plainToInstance from copying
// a body key of that name, and the root context reports it as field "".
const BODY_PROPERTY = "__body";

export const IsNotEmptyBody =
  (options?: ValidationOptions): ClassDecorator =>
  (target) => {
    Exclude()(target.prototype as object, BODY_PROPERTY);
    registerDecorator({
      name: "isNotEmptyBody",
      target,
      propertyName: BODY_PROPERTY,
      options: {
        ...options,
        context: { ...options?.context, root: true }
      },
      validator: {
        validate: (_value: unknown, args: ValidationArguments) =>
          Object.entries(args.object).some(
            ([key, value]) => key !== BODY_PROPERTY && value !== undefined
          )
      }
    });
  };
