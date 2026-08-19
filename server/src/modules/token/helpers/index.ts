// libs
import jwt, { type Secret } from "jsonwebtoken";
// types
import type { StringValue } from "ms";
// common
import { ForbiddenError } from "@/common/exceptions";
// others
import ENV from "@/constants/env";
import { ERROR_CODES } from "@/constants/error-code";
import { TOKEN_EXPIRY, TOKEN_ERRORS } from "../constants";

const TOKEN_TYPES = {
  ACCESS: "ACCESS",
  REFRESH: "REFRESH",
  ID_TOKEN: "ID_TOKEN"
} as const;

type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
type VerifiableTokenType = Exclude<TokenType, typeof TOKEN_TYPES.ID_TOKEN>;

type TExpiresIn = StringValue | number;

interface TokenConfig {
  secret: Secret;
  expiresIn: TExpiresIn;
}

const TOKEN_CONFIGS: Record<TokenType, TokenConfig> = {
  [TOKEN_TYPES.ACCESS]: {
    secret: ENV.JWT_ACCESS_SECRET,
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN
  },
  [TOKEN_TYPES.REFRESH]: {
    secret: ENV.JWT_REFRESH_SECRET,
    expiresIn: TOKEN_EXPIRY.REFRESH_TOKEN
  },
  [TOKEN_TYPES.ID_TOKEN]: {
    secret: ENV.JWT_ID_SECRET,
    expiresIn: TOKEN_EXPIRY.ID_TOKEN
  }
};

const ERROR_TRANSLATION_KEYS: Record<string, I18n.Key> = {
  [TOKEN_ERRORS.JSON_WEB_TOKEN_ERROR]: "common:errors.invalidToken",
  [TOKEN_ERRORS.TOKEN_EXPIRED_ERROR]: "common:errors.tokenExpired"
};

const ERROR_CODE_MAP: Record<string, string> = {
  [TOKEN_ERRORS.JSON_WEB_TOKEN_ERROR]: ERROR_CODES.JWT_INVALID,
  [TOKEN_ERRORS.TOKEN_EXPIRED_ERROR]: ERROR_CODES.JWT_EXPIRED
};

const signToken = (payload: object, type: TokenType): string => {
  const { secret, expiresIn } = TOKEN_CONFIGS[type];
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = <T>(token: string, type: VerifiableTokenType): T => {
  try {
    const { secret } = TOKEN_CONFIGS[type];
    return jwt.verify(token, secret) as T;
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const translationKey =
      ERROR_TRANSLATION_KEYS[errorName] ?? "common:errors.invalidToken";
    const errorCode = ERROR_CODE_MAP[errorName] ?? ERROR_CODES.JWT_INVALID;
    throw new ForbiddenError({
      i18nMessage: (t) => t(translationKey),
      code: errorCode
    });
  }
};

type AccessTokenInput = Omit<AccessTokenPayload, keyof BaseTokenClaims>;
type IdTokenInput = Omit<IdTokenPayload, keyof BaseTokenClaims>;
// tokenVersion is optional on the payload (graceful migration for old tokens)
// but REQUIRED when issuing — every newly-signed refresh token must embed it.
type RefreshTokenInput = Omit<RefreshTokenPayload, keyof BaseTokenClaims> & {
  tokenVersion: number;
};

export const generateAccessToken = (payload: AccessTokenInput): string =>
  signToken(payload, TOKEN_TYPES.ACCESS);

export const generateRefreshToken = (payload: RefreshTokenInput): string =>
  signToken(payload, TOKEN_TYPES.REFRESH);

export const generateIdToken = (payload: IdTokenInput): string =>
  signToken(payload, TOKEN_TYPES.ID_TOKEN);

export const verifyAccessToken = <T = AccessTokenPayload>(token: string): T =>
  verifyToken<T>(token, TOKEN_TYPES.ACCESS);

export const verifyRefreshToken = <T = RefreshTokenPayload>(token: string): T =>
  verifyToken<T>(token, TOKEN_TYPES.REFRESH);
