// libs
import { Types } from "mongoose";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { EMAIL_FORMAT_PATTERN, EMAIL_VALIDATION } from "./constants";

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

export const sanitizeText = (text: string): string =>
  text
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();
