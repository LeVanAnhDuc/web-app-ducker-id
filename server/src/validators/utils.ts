// libs
import Joi from "joi";
import { Types } from "mongoose";
// common
import { BadRequestError } from "@/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import {
  EMAIL_FORMAT_PATTERN,
  EMAIL_VALIDATION,
  OBJECTID_PATTERN
} from "./constants";

export const validateEmail = (email: string): void => {
  if (!email || typeof email !== "string") {
    throw new BadRequestError({
      message: "Email is required",
      code: ERROR_CODES.VALIDATION_EMAIL_REQUIRED
    });
  }

  const trimmed = email.trim();

  if (
    trimmed.length < EMAIL_VALIDATION.MIN_LENGTH ||
    trimmed.length > EMAIL_VALIDATION.MAX_LENGTH
  ) {
    throw new BadRequestError({
      message: "Invalid email format",
      code: ERROR_CODES.VALIDATION_EMAIL_INVALID
    });
  }

  if (!EMAIL_FORMAT_PATTERN.test(trimmed)) {
    throw new BadRequestError({
      message: "Invalid email format",
      code: ERROR_CODES.VALIDATION_EMAIL_INVALID
    });
  }
};

export const validateObjectId = (id: string, fieldName: string): void => {
  if (!id || typeof id !== "string") {
    throw new BadRequestError({
      message: `${fieldName} is required`,
      code: ERROR_CODES.VALIDATION_OBJECT_ID_REQUIRED
    });
  }

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError({
      message: `Invalid ${fieldName} format`,
      code: ERROR_CODES.VALIDATION_OBJECT_ID_INVALID
    });
  }
};

export const validateRequiredString = (
  value: string,
  fieldName: string
): void => {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestError({
      message: `${fieldName} is required`,
      code: ERROR_CODES.VALIDATION_FIELD_REQUIRED
    });
  }
};

export const validateStringLength = (
  value: string,
  fieldName: string,
  min: number,
  max: number
): void => {
  if (value.length < min) {
    throw new BadRequestError({
      message: `${fieldName} is too short`,
      code: ERROR_CODES.VALIDATION_FIELD_TOO_SHORT
    });
  }
  if (value.length > max) {
    throw new BadRequestError({
      message: `${fieldName} is too long`,
      code: ERROR_CODES.VALIDATION_FIELD_TOO_LONG
    });
  }
};

// Entities are decoded BEFORE tags are stripped, so an encoded tag
// (`&lt;img onerror=…&gt;`) cannot come out of here as a real one. `&amp;` is
// decoded last for the same reason: `&amp;lt;` stays the literal text `&lt;`.
export const sanitizeText = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .trim();

const timeZoneCache = new Map<string, boolean>();

/**
 * Whether this runtime can actually resolve a timezone name.
 *
 * A timezone from the client reaches `$dateToString`, so it has to be checked
 * against the runtime rather than against a pattern. The check is "can ICU use
 * it", not "is it in `Intl.supportedValuesOf`": that list holds only the
 * canonical spelling of each zone, and which spelling is canonical depends on
 * the ICU build. On the Node this project runs, the list contains
 * `Asia/Saigon` but not `Asia/Ho_Chi_Minh`, `Asia/Calcutta` but not
 * `Asia/Kolkata`, and no `UTC` at all — while browsers send either name
 * depending on their own ICU. Validating against the list would reject real
 * users over nothing more than a version difference.
 *
 * `Intl.DateTimeFormat` accepts canonical names and links alike and throws
 * `RangeError` on anything else, which is exactly the property needed here.
 */
export const isSupportedTimeZone = (value: string): boolean => {
  const cached = timeZoneCache.get(value);
  if (cached !== undefined) return cached;

  let supported = false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    supported = true;
  } catch {
    supported = false;
  }

  // Bounded by the Joi string limit upstream; one entry per distinct zone the
  // clients actually send.
  if (timeZoneCache.size < 1000) timeZoneCache.set(value, supported);
  return supported;
};

export const objectIdSchema = (namespace: string, key: string) =>
  Joi.string()
    .pattern(OBJECTID_PATTERN)
    .required()
    .messages({
      "string.base": `${namespace}:validation.${key}.invalid`,
      "string.empty": `${namespace}:validation.${key}.invalid`,
      "any.required": `${namespace}:validation.${key}.invalid`,
      "string.pattern.base": `${namespace}:validation.${key}.invalid`
    });
