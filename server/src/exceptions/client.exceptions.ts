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
      key: opts.key,
      params: opts.params
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
      key: opts.key,
      params: opts.params
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.UNAUTHORIZED,
      code: opts.code ?? ERROR_CODES.UNAUTHORIZED,
      message: opts.message ?? REASON_PHRASES.UNAUTHORIZED,
      key: opts.key,
      params: opts.params
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.FORBIDDEN,
      code: opts.code ?? ERROR_CODES.FORBIDDEN,
      message: opts.message ?? REASON_PHRASES.FORBIDDEN,
      key: opts.key,
      params: opts.params
    });
  }
}

export class NotFoundError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.NOT_FOUND,
      code: opts.code ?? ERROR_CODES.NOT_FOUND,
      message: opts.message ?? REASON_PHRASES.NOT_FOUND,
      key: opts.key,
      params: opts.params
    });
  }
}

export class ConflictRequestError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.CONFLICT,
      code: opts.code ?? ERROR_CODES.CONFLICT,
      message: opts.message ?? REASON_PHRASES.CONFLICT,
      key: opts.key,
      params: opts.params
    });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.TOO_MANY_REQUESTS,
      code: opts.code ?? ERROR_CODES.TOO_MANY_REQUESTS,
      message: opts.message ?? REASON_PHRASES.TOO_MANY_REQUESTS,
      key: opts.key,
      params: opts.params
    });
  }
}
