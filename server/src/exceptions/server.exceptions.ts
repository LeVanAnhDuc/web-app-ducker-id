// libs
import { getReasonPhrase, StatusCodes } from "http-status-codes";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { AppError, httpError } from "./base.exception";

export class InternalServerError extends httpError(
  StatusCodes.INTERNAL_SERVER_ERROR,
  ERROR_CODES.INTERNAL_SERVER_ERROR
) {}

export class ServiceUnavailableError extends httpError(
  StatusCodes.SERVICE_UNAVAILABLE,
  ERROR_CODES.SERVICE_UNAVAILABLE
) {}

export class DatabaseError extends AppError {
  readonly operation: string;

  constructor(operation: string, cause: unknown) {
    super({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.DATABASE_ERROR,
      message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      cause
    });
    this.operation = operation;
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.CONFIG_ERROR,
      message
    });
  }
}
