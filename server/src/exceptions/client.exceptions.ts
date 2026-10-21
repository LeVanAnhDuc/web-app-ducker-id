// types
import type { ValidationErrorItem } from "@/types/common";
// common
import { REASON_PHRASES, STATUS_CODES } from "@/common/http";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { AppError, type AppErrorOptions } from "./base.exception";

export class BadRequestError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.BAD_REQUEST,
      code: opts.code ?? ERROR_CODES.BAD_REQUEST,
      message: opts.message ?? REASON_PHRASES.BAD_REQUEST,
      i18nMessage: opts.i18nMessage
    });
  }
}

export interface ValidationErrorOptions extends AppErrorOptions {
  errors?: ValidationErrorItem[];
}

export class ValidationError extends AppError {
  constructor(opts: ValidationErrorOptions = {}) {
    super({
      status: STATUS_CODES.BAD_REQUEST,
      code: opts.code ?? ERROR_CODES.VALIDATION_ERROR,
      message: opts.message ?? REASON_PHRASES.BAD_REQUEST,
      errors: opts.errors ?? [],
      i18nMessage: opts.i18nMessage
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.UNAUTHORIZED,
      code: opts.code ?? ERROR_CODES.UNAUTHORIZED,
      message: opts.message ?? REASON_PHRASES.UNAUTHORIZED,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.FORBIDDEN,
      code: opts.code ?? ERROR_CODES.FORBIDDEN,
      message: opts.message ?? REASON_PHRASES.FORBIDDEN,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class NotFoundError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.NOT_FOUND,
      code: opts.code ?? ERROR_CODES.NOT_FOUND,
      message: opts.message ?? REASON_PHRASES.NOT_FOUND,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class ConflictRequestError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.CONFLICT,
      code: opts.code ?? ERROR_CODES.CONFLICT,
      message: opts.message ?? REASON_PHRASES.CONFLICT,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.TOO_MANY_REQUESTS,
      code: opts.code ?? ERROR_CODES.TOO_MANY_REQUESTS,
      message: opts.message ?? REASON_PHRASES.TOO_MANY_REQUESTS,
      i18nMessage: opts.i18nMessage
    });
  }
}
