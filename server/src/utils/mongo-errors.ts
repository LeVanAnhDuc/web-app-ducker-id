// libs
import mongoose from "mongoose";
// types
import type { ValidationErrorItem } from "@/types/common";

const DUPLICATE_KEY_CODE = 11000;

type MongoServerErrorLike = Error & {
  code: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
};

export function isDuplicateKeyError(err: unknown): err is MongoServerErrorLike {
  if (!(err instanceof Error)) return false;
  if (!("code" in err)) return false;
  return (err as { code: unknown }).code === DUPLICATE_KEY_CODE;
}

export function getDuplicatedField(err: MongoServerErrorLike): string | null {
  const keyPattern = err.keyPattern;
  if (keyPattern && typeof keyPattern === "object") {
    const keys = Object.keys(keyPattern);
    if (keys.length > 0) return keys[0];
  }

  const keyValue = err.keyValue;
  if (keyValue && typeof keyValue === "object") {
    const keys = Object.keys(keyValue);
    if (keys.length > 0) return keys[0];
  }

  return null;
}

export function isMongooseValidationError(
  err: unknown
): err is mongoose.Error.ValidationError {
  return err instanceof mongoose.Error.ValidationError;
}

export function isMongooseCastError(
  err: unknown
): err is mongoose.Error.CastError {
  return err instanceof mongoose.Error.CastError;
}

export function extractValidationErrors(
  err: mongoose.Error.ValidationError
): ValidationErrorItem[] {
  return Object.entries(err.errors).map(([field, detail]) => {
    const message =
      detail instanceof Error ? detail.message : String(detail ?? "");
    const reason =
      detail instanceof mongoose.Error.ValidatorError
        ? detail.kind
        : detail instanceof mongoose.Error.CastError
          ? "cast"
          : "validation";

    return { field, reason, message };
  });
}
