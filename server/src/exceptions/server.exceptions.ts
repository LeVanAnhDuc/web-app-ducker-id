// libs
import { getReasonPhrase, StatusCodes } from "http-status-codes";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { AppError, type AppErrorOptions } from "./base.exception";

export class InternalServerError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      code: opts.code ?? ERROR_CODES.INTERNAL_SERVER_ERROR,
      message:
        opts.message ?? getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      key: opts.key,
      params: opts.params
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super({
      status: StatusCodes.SERVICE_UNAVAILABLE,
      code: opts.code ?? ERROR_CODES.SERVICE_UNAVAILABLE,
      message: opts.message ?? getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE),
      key: opts.key,
      params: opts.params
    });
  }
}

export class DatabaseError extends AppError {
  readonly operation: string;
  override readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    super({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.DATABASE_ERROR,
      message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR)
    });
    this.name = "DatabaseError";
    this.operation = operation;
    this.cause = cause;
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.CONFIG_ERROR,
      message
    });
    this.name = "ConfigError";
  }
}
