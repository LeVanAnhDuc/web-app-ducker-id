// types
import type { NextFunction, Request, Response } from "express";
import type { ValidationErrorItem } from "@/types/common";
// common
import { ErrorResponse } from "@/common/exceptions";
import { STATUS_CODES } from "@/common/http";
// others
import { ERROR_CODES } from "@/constants/error-code";
import {
  isDuplicateKeyError,
  getDuplicatedField,
  isMongooseValidationError,
  isMongooseCastError,
  extractValidationErrors
} from "@/utils/mongo-errors";

export const handleNotFound = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new ErrorResponse({
    code: ERROR_CODES.NOT_FOUND,
    status: STATUS_CODES.NOT_FOUND,
    i18nMessage: (t) => t("common:errors.notFound")
  });

  next(error);
};

export const handleError = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const baseBody = {
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  if (isDuplicateKeyError(err)) {
    const field = getDuplicatedField(err);
    const message = field
      ? req.t("common:errors.duplicateKey", { field })
      : req.t("common:errors.duplicateKeyGeneric");

    const body: ErrorPattern = {
      code: ERROR_CODES.DUPLICATE_KEY,
      message,
      ...baseBody,
      ...(field && {
        errors: [{ field, reason: "duplicate", message }]
      })
    };

    return res.status(STATUS_CODES.CONFLICT).json(body);
  }

  if (isMongooseValidationError(err)) {
    const errors: ValidationErrorItem[] = extractValidationErrors(err);

    const body: ErrorPattern = {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: req.t("common:errors.validationFailed"),
      ...baseBody,
      ...(errors.length > 0 && { errors })
    };

    return res.status(STATUS_CODES.BAD_REQUEST).json(body);
  }

  if (isMongooseCastError(err)) {
    const message = req.t("common:errors.invalidObjectId");
    const body: ErrorPattern = {
      code: ERROR_CODES.INVALID_OBJECT_ID,
      message,
      ...baseBody,
      errors: [
        {
          field: err.path,
          reason: "cast",
          message
        }
      ]
    };

    return res.status(STATUS_CODES.BAD_REQUEST).json(body);
  }

  if (err instanceof ErrorResponse) {
    const message = err.i18nMessage ? err.i18nMessage(req.t) : err.message;
    const body: ErrorPattern = {
      code: err.code,
      message,
      ...baseBody,
      ...(err.errors.length > 0 && { errors: err.errors })
    };

    return res.status(err.status).json(body);
  }

  const body: ErrorPattern = {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: req.t("common:errors.internalServer"),
    ...baseBody
  };

  return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(body);
};
