// libs
import jwt, { type Secret } from "jsonwebtoken";
// types
import type { StringValue } from "ms";
// common
import { ForbiddenError } from "@/common/exceptions";
// others
import ENV from "@/constants/env";
import { ERROR_CODES } from "@/constants/error-code";
import {
  SIGNING_ALGORITHM,
  getKeyId,
  getSigningKey,
  getVerificationKey
} from "@/libs/jwks";
import { TOKEN_EXPIRY, TOKEN_ERRORS } from "../constants";

/**
 * access_token và id_token ký bằng RS256 để app vệ tinh verify được bằng public
 * key ở /.well-known/jwks.json mà không cần giữ bí mật nào. refresh_token vẫn
 * HS256: nó chỉ đi giữa trình duyệt và Ducker ID, không ai khác cần verify.
 */

const TOKEN_TYPES = {
  ACCESS: "ACCESS",
  REFRESH: "REFRESH",
  ID_TOKEN: "ID_TOKEN"
} as const;

type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
type VerifiableTokenType = Exclude<TokenType, typeof TOKEN_TYPES.ID_TOKEN>;

type TExpiresIn = StringValue | number;

interface TokenConfig {
  expiresIn: TExpiresIn;
  asymmetric: boolean;
  secret?: Secret;
}

const TOKEN_CONFIGS: Record<TokenType, TokenConfig> = {
  [TOKEN_TYPES.ACCESS]: {
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN,
    asymmetric: true
  },
  [TOKEN_TYPES.REFRESH]: {
    secret: ENV.JWT_REFRESH_SECRET,
    expiresIn: TOKEN_EXPIRY.REFRESH_TOKEN,
    asymmetric: false
  },
  [TOKEN_TYPES.ID_TOKEN]: {
    expiresIn: TOKEN_EXPIRY.ID_TOKEN,
    asymmetric: true
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
  const config = TOKEN_CONFIGS[type];

  if (!config.asymmetric) {
    return jwt.sign(payload, config.secret as Secret, {
      expiresIn: config.expiresIn
    });
  }

  // audience = chính issuer: đánh dấu đây là token FIRST-PARTY của Ducker ID.
  // Token phát cho app vệ tinh mang aud = clientId nên sẽ trượt ở verify bên
  // dưới — một access token của badminton không gọi được API của Ducker ID.
  return jwt.sign(payload, getSigningKey(), {
    algorithm: SIGNING_ALGORITHM,
    keyid: getKeyId(),
    issuer: ENV.OIDC_ISSUER,
    audience: ENV.OIDC_ISSUER,
    expiresIn: config.expiresIn
  });
};

const verifyToken = <T>(token: string, type: VerifiableTokenType): T => {
  try {
    const config = TOKEN_CONFIGS[type];

    if (!config.asymmetric) {
      return jwt.verify(token, config.secret as Secret) as T;
    }

    return jwt.verify(token, getVerificationKey(), {
      algorithms: [SIGNING_ALGORITHM],
      issuer: ENV.OIDC_ISSUER,
      audience: ENV.OIDC_ISSUER
    }) as T;
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

/**
 * Ký token cho luồng OAuth. Tách riêng khỏi generateAccessToken/generateIdToken
 * vì token phát cho app vệ tinh mang thêm `aud`, `scope`, `sid`, `nonce` —
 * những claim mà token first-party của chính Ducker ID không có.
 */
export const signOAuthToken = (
  payload: Record<string, unknown>,
  audience: string,
  expiresIn: TExpiresIn
): string =>
  jwt.sign(payload, getSigningKey(), {
    algorithm: SIGNING_ALGORITHM,
    keyid: getKeyId(),
    issuer: ENV.OIDC_ISSUER,
    audience,
    expiresIn
  });

export interface OAuthAccessTokenPayload {
  sub: string;
  authId: string;
  sid: string;
  scope: string;
  aud: string;
}

/**
 * Verify access token do luồng OAuth phát ra. Khác verifyAccessToken ở chỗ
 * KHÔNG ép audience về issuer — token này mang aud = clientId của app vệ tinh.
 * Caller tự quyết định chấp nhận audience nào.
 */
export const verifyOAuthAccessToken = (
  token: string
): OAuthAccessTokenPayload =>
  jwt.verify(token, getVerificationKey(), {
    algorithms: [SIGNING_ALGORITHM],
    issuer: ENV.OIDC_ISSUER
  }) as OAuthAccessTokenPayload;
