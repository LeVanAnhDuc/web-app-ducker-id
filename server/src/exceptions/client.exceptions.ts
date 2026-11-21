// libs
import { getReasonPhrase, StatusCodes } from "http-status-codes";
// types
import type { ValidationErrorItem } from "@/types/common";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { AppError, type AppErrorOptions } from "./base.exception";

export class BadRequestError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: StatusCodes.BAD_REQUEST,
      code: opts.code ?? ERROR_CODES.BAD_REQUEST,
      message: opts.message ?? getReasonPhrase(StatusCodes.BAD_REQUEST),
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
      status: StatusCodes.BAD_REQUEST,
      code: opts.code ?? ERROR_CODES.VALIDATION_ERROR,
      message: opts.message ?? getReasonPhrase(StatusCodes.BAD_REQUEST),
      errors: opts.errors ?? [],
      key: opts.key,
      params: opts.params
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: StatusCodes.UNAUTHORIZED,
      code: opts.code ?? ERROR_CODES.UNAUTHORIZED,
      message: opts.message ?? getReasonPhrase(StatusCodes.UNAUTHORIZED),
      key: opts.key,
      params: opts.params
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: StatusCodes.FORBIDDEN,
      code: opts.code ?? ERROR_CODES.FORBIDDEN,
      message: opts.message ?? getReasonPhrase(StatusCodes.FORBIDDEN),
      key: opts.key,
      params: opts.params
    });
  }
}

export class NotFoundError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: StatusCodes.NOT_FOUND,
      code: opts.code ?? ERROR_CODES.NOT_FOUND,
      message: opts.message ?? getReasonPhrase(StatusCodes.NOT_FOUND),
      key: opts.key,
      params: opts.params
    });
  }
}

export class ConflictRequestError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: StatusCodes.CONFLICT,
      code: opts.code ?? ERROR_CODES.CONFLICT,
      message: opts.message ?? getReasonPhrase(StatusCodes.CONFLICT),
      key: opts.key,
      params: opts.params
    });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: StatusCodes.TOO_MANY_REQUESTS,
      code: opts.code ?? ERROR_CODES.TOO_MANY_REQUESTS,
      message: opts.message ?? getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
      key: opts.key,
      params: opts.params
    });
  }
}
