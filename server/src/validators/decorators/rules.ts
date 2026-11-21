// libs
import { Exclude } from "class-transformer";
import { registerDecorator, ValidateIf } from "class-validator";
// types
import type { ValidationArguments, ValidationOptions } from "class-validator";
// validators
import { OBJECTID_PATTERN } from "@/validators/constants";
import { getDateOfBirthBounds } from "@/validators/date-of-birth";
import { isSupportedTimeZone, toIsoDateString } from "@/validators/utils";
import { ITEM_CHECK } from "@/validators/validate-dto";
import type { ItemCheck } from "@/validators/validate-dto";

type Check = (value: unknown, args: ValidationArguments) => boolean;

/** Registers a named custom constraint on one property. */
export const rule =
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

/**
 * A rule checked item by item, which Joi reported at `field.<index>` for each
 * failing item. class-validator's own `each` reports the whole array once, so
 * the check rides along in the context and validateDto names every index.
 * A non-array is left to the `@IsArray()` underneath.
 */
export const EachItem = (
  name: string,
  check: ItemCheck,
  options?: ValidationOptions
): PropertyDecorator =>
  rule(name, (value) => !Array.isArray(value) || value.every(check), {
    ...options,
    context: { ...options?.context, [ITEM_CHECK]: check }
  });

// A single-value rule that also takes `{ each: true }`, reported per item.
const itemRule = (
  name: string,
  check: (value: unknown) => boolean,
  options?: ValidationOptions
): PropertyDecorator => {
  if (!options?.each) return rule(name, check, options);
  const { each: _each, ...rest } = options;
  return EachItem(name, (item) => check(item), rest);
};

const sameValue = (a: unknown, b: unknown): boolean => a === b;

/**
 * Joi's `array().unique()`: every repeat is reported at its own index, the
 * first occurrence is not.
 */
export const ArrayUniqueItems = (
  options?: ValidationOptions,
  same: (a: unknown, b: unknown) => boolean = sameValue
): PropertyDecorator =>
  EachItem(
    "arrayUnique",
    (item, index, items) => {
      // A comparator may not match an item to itself (a pair comparator on a
      // non-object): with no match at all the item is not a repeat.
      const first = items.findIndex((other) => same(other, item));
      return first === -1 || first === index;
    },
    options
  );

export const IsObjectId = (
  key: string,
  options?: ValidationOptions
): PropertyDecorator =>
  itemRule(
    "isObjectId",
    (value) => typeof value === "string" && OBJECTID_PATTERN.test(value),
    { ...options, message: key }
  );

/**
 * Skips a missing field only. `@IsOptional()` also skips `null`, which Joi
 * refuses on a body field unless `.allow(null)` says otherwise.
 */
export const UnlessMissing = (): PropertyDecorator =>
  ValidateIf((_object, value) => value !== undefined);

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

export const IsIsoDateString = (
  options?: ValidationOptions
): PropertyDecorator =>
  rule(
    "isIsoDateString",
    (value) => typeof value === "string" && toIsoDateString(value) !== null,
    options
  );

export const IsSupportedTimeZone = (
  options?: ValidationOptions
): PropertyDecorator =>
  rule(
    "isSupportedTimeZone",
    (value) => typeof value === "string" && isSupportedTimeZone(value),
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
