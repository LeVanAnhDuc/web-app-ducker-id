// types
import type { ValidationErrorItem } from "@/types/common";
// common
import { STATUS_CODES } from "@/common/http";
// others
import { ERROR_CODES } from "@/constants/error-code";

export type I18nMessageThunk = (t: TranslateFunction) => string;

interface AppErrorInit {
  status: number;
  message?: string;
  code?: string;
  errors?: ValidationErrorItem[];
  i18nMessage?: I18nMessageThunk;
}

export interface AppErrorOptions {
  i18nMessage?: I18nMessageThunk;
  code?: string;
  message?: string;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ValidationErrorItem[];
  readonly i18nMessage?: I18nMessageThunk;

  constructor({
    status = STATUS_CODES.INTERNAL_SERVER_ERROR,
    code = ERROR_CODES.INTERNAL_SERVER_ERROR,
    message = "An unexpected error occurred",
    errors = [],
    i18nMessage
  }: AppErrorInit) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.i18nMessage = i18nMessage;
  }
}
