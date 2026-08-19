import type { ResponseMeta, ValidationErrorItem } from "@/types/common";

declare global {
  interface TranslateFunction {
    (key: I18n.Key, options?: Record<string, unknown>): string;
    (
      key: I18n.Key,
      defaultValue: string,
      options?: Record<string, unknown>
    ): string;
  }

  interface ResponsePattern<T> {
    message: string;
    timestamp: string;
    path: string;
    data?: T;
    meta?: ResponseMeta;
  }

  interface ErrorPattern {
    code: string;
    message: string;
    timestamp: string;
    path: string;
    errors?: ValidationErrorItem[];
  }

  interface BaseTokenClaims {
    iat?: number;
    exp?: number;
  }

  interface AccessTokenPayload extends BaseTokenClaims {
    sub: string;
    authId: string;
    roles: string;
  }

  interface IdTokenPayload extends BaseTokenClaims {
    sub: string;
    name: string;
    email: string;
    picture: string | null;
    mustChangePassword?: boolean;
  }

  interface RefreshTokenPayload extends BaseTokenClaims {
    sub: string;
    authId: string;
    // Per-token revocation discriminator. Optional on the payload so
    // pre-existing in-flight tokens (issued before this field) verify as
    // undefined → treated as 0 by the guard (graceful migration).
    tokenVersion?: number;
  }

  type RequestUserPayload = Pick<
    AccessTokenPayload,
    "sub" | "authId" | "roles"
  >;

  namespace Express {
    interface Request {
      requestId: string;
      language: string;
      t: TranslateFunction;
    }
  }
}

export {};
