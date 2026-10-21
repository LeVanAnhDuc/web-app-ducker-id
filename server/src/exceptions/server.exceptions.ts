// common
import { REASON_PHRASES, STATUS_CODES } from "@/common/http";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { AppError, type AppErrorOptions } from "./base.exception";

export class InternalServerError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: opts.code ?? ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: opts.message ?? REASON_PHRASES.INTERNAL_SERVER_ERROR,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: STATUS_CODES.SERVICE_UNAVAILABLE,
      code: opts.code ?? ERROR_CODES.SERVICE_UNAVAILABLE,
      message: opts.message ?? REASON_PHRASES.SERVICE_UNAVAILABLE,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class DatabaseError extends AppError {
  readonly operation: string;
  override readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    super({
      status: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.DATABASE_ERROR,
      message: REASON_PHRASES.INTERNAL_SERVER_ERROR
    });
    this.name = "DatabaseError";
    this.operation = operation;
    this.cause = cause;
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super({
      status: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.CONFIG_ERROR,
      message
    });
    this.name = "ConfigError";
  }
}
