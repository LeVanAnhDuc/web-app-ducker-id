// types
import type { ValidationErrorItem } from "@/types/common";
// common
import { STATUS_CODES } from "@/common/http";
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
}

export interface AppErrorOptions {
  code?: string;
  key?: I18n.Key;
  params?: I18nParams;
  message?: string;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ValidationErrorItem[];
  readonly key?: I18n.Key;
  readonly params?: I18nParams;

  constructor({
    status = STATUS_CODES.INTERNAL_SERVER_ERROR,
    code = ERROR_CODES.INTERNAL_SERVER_ERROR,
    message = "An unexpected error occurred",
    errors = [],
    key,
    params
  }: AppErrorInit) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.key = key;
    this.params = params;
  }
}
