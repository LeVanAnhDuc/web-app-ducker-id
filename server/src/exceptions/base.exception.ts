// libs
import { getReasonPhrase, StatusCodes } from "http-status-codes";
// types
import type { ValidationErrorItem } from "@/types/common";
// others
import { ERROR_CODES } from "@/constants/error-code";

export type I18nParams = Record<string, unknown>;

interface AppErrorInit {
  status: number;
  message?: string;
  code?: string;
  errors?: ValidationErrorItem[];
  key?: I18n.Key;
  params?: I18nParams;
  cause?: unknown;
}

export interface AppErrorOptions {
  code?: string;
  key?: I18n.Key;
  params?: I18nParams;
  message?: string;
  /** The error being wrapped — logged by the filter, never sent to the client. */
  cause?: unknown;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ValidationErrorItem[];
  readonly key?: I18n.Key;
  readonly params?: I18nParams;
  override readonly cause?: unknown;

  constructor({
    status = StatusCodes.INTERNAL_SERVER_ERROR,
    code = ERROR_CODES.INTERNAL_SERVER_ERROR,
    message = "An unexpected error occurred",
    errors = [],
    key,
    params,
    cause
  }: AppErrorInit) {
    super(message);
    // The subclass's own name, so logs read "NotFoundError" rather than "Error"
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.key = key;
    this.params = params;
    this.cause = cause;
  }
}

/**
 * Builds the base of an error class whose status and default code are fixed:
 * `class NotFoundError extends httpError(StatusCodes.NOT_FOUND, …) {}`.
 * Callers may still override the code, and pass a key, params, message or cause.
 */
export const httpError = (status: StatusCodes, defaultCode: string) =>
  class extends AppError {
    constructor(opts: AppErrorOptions = {}) {
      super({
        status,
        code: opts.code ?? defaultCode,
        message: opts.message ?? getReasonPhrase(status),
        key: opts.key,
        params: opts.params,
        cause: opts.cause
      });
    }
  };
