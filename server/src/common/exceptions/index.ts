// types
import type { ValidationErrorItem } from "@/types/common";
// common
import { REASON_PHRASES, STATUS_CODES } from "@/common/http";
// others
import { ERROR_CODES } from "@/constants/error-code";

type I18nMessageThunk = (t: TranslateFunction) => string;

interface ErrorResponseInit {
  status: number;
  message?: string;
  code?: string;
  errors?: ValidationErrorItem[];
  i18nMessage?: I18nMessageThunk;
}

interface DomainErrorOptions {
  i18nMessage?: I18nMessageThunk;
  code?: string;
  message?: string;
}

export class ErrorResponse extends Error {
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
  }: ErrorResponseInit) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.i18nMessage = i18nMessage;
  }
}

export class ConflictRequestError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.CONFLICT,
      code: opts.code ?? ERROR_CODES.CONFLICT,
      message: opts.message ?? REASON_PHRASES.CONFLICT,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class BadRequestError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.BAD_REQUEST,
      code: opts.code ?? ERROR_CODES.BAD_REQUEST,
      message: opts.message ?? REASON_PHRASES.BAD_REQUEST,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class ForbiddenError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.FORBIDDEN,
      code: opts.code ?? ERROR_CODES.FORBIDDEN,
      message: opts.message ?? REASON_PHRASES.FORBIDDEN,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class NotFoundError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.NOT_FOUND,
      code: opts.code ?? ERROR_CODES.NOT_FOUND,
      message: opts.message ?? REASON_PHRASES.NOT_FOUND,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class UnauthorizedError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.UNAUTHORIZED,
      code: opts.code ?? ERROR_CODES.UNAUTHORIZED,
      message: opts.message ?? REASON_PHRASES.UNAUTHORIZED,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class RedisError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: opts.code ?? ERROR_CODES.REDIS_ERROR,
      message: opts.message ?? REASON_PHRASES.INTERNAL_SERVER_ERROR,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class TooManyRequestsError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.TOO_MANY_REQUESTS,
      code: opts.code ?? ERROR_CODES.TOO_MANY_REQUESTS,
      message: opts.message ?? REASON_PHRASES.TOO_MANY_REQUESTS,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class InternalServerError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.INTERNAL_SERVER_ERROR,
      code: opts.code ?? ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: opts.message ?? REASON_PHRASES.INTERNAL_SERVER_ERROR,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class ServiceUnavailableError extends ErrorResponse {
  constructor(opts: DomainErrorOptions = {}) {
    super({
      status: STATUS_CODES.SERVICE_UNAVAILABLE,
      code: opts.code ?? ERROR_CODES.SERVICE_UNAVAILABLE,
      message: opts.message ?? REASON_PHRASES.SERVICE_UNAVAILABLE,
      i18nMessage: opts.i18nMessage
    });
  }
}

export class DatabaseError extends ErrorResponse {
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

export interface ValidationErrorOptions extends DomainErrorOptions {
  errors?: ValidationErrorItem[];
}

export class ValidationError extends ErrorResponse {
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

export interface OAuthErrorOptions {
  /** Mã lỗi theo chuẩn OAuth/OIDC — giá trị của field `error` trong response. */
  error: string;
  description?: string;
  status?: number;
  /**
   * Khi đã xác thực được redirect_uri thì lỗi phải quay về client qua redirect
   * (RFC 6749 §4.1.2.1). Bỏ trống → trả JSON, dùng cho trường hợp client_id
   * hoặc redirect_uri không hợp lệ, lúc đó redirect là lỗ hổng open redirect.
   */
  redirectUri?: string;
  state?: string;
}

/**
 * Lỗi của luồng OAuth. Không dùng envelope ErrorPattern chung vì RFC 6749 §5.2
 * quy định body phải là { error, error_description } — app vệ tinh và thư viện
 * OIDC dựa vào đúng shape đó. Được format bởi `handleOAuthError`.
 */
export class OAuthError extends ErrorResponse {
  readonly oauthError: string;
  readonly description?: string;
  readonly redirectUri?: string;
  readonly state?: string;

  constructor(opts: OAuthErrorOptions) {
    super({
      status: opts.status ?? STATUS_CODES.BAD_REQUEST,
      code: ERROR_CODES.OAUTH_ERROR,
      message: opts.description ?? opts.error
    });
    this.name = "OAuthError";
    this.oauthError = opts.error;
    this.description = opts.description;
    this.redirectUri = opts.redirectUri;
    this.state = opts.state;
  }
}
