// libs
import { getReasonPhrase, StatusCodes } from "http-status-codes";
// types
import type { ValidationErrorItem } from "@/types/common";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { AppError, httpError, type AppErrorOptions } from "./base.exception";

export class BadRequestError extends httpError(
  StatusCodes.BAD_REQUEST,
  ERROR_CODES.BAD_REQUEST
) {}

export class UnauthorizedError extends httpError(
  StatusCodes.UNAUTHORIZED,
  ERROR_CODES.UNAUTHORIZED
) {}

export class ForbiddenError extends httpError(
  StatusCodes.FORBIDDEN,
  ERROR_CODES.FORBIDDEN
) {}

export class NotFoundError extends httpError(
  StatusCodes.NOT_FOUND,
  ERROR_CODES.NOT_FOUND
) {}

export class ConflictRequestError extends httpError(
  StatusCodes.CONFLICT,
  ERROR_CODES.CONFLICT
) {}

export class TooManyRequestsError extends httpError(
  StatusCodes.TOO_MANY_REQUESTS,
  ERROR_CODES.TOO_MANY_REQUESTS
) {}

export interface ValidationErrorOptions extends AppErrorOptions {
  errors?: ValidationErrorItem[];
}

// The one client error that carries per-field details, so it keeps its own
// constructor instead of the shared httpError one.
export class ValidationError extends AppError {
  constructor(opts: ValidationErrorOptions = {}) {
    super({
      status: StatusCodes.BAD_REQUEST,
      code: opts.code ?? ERROR_CODES.VALIDATION_ERROR,
      message: opts.message ?? getReasonPhrase(StatusCodes.BAD_REQUEST),
      errors: opts.errors ?? [],
      key: opts.key,
      params: opts.params,
      cause: opts.cause
    });
  }
}
