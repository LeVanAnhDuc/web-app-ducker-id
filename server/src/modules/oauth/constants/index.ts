// others
import { SECONDS_PER_MINUTE } from "@/constants/time";

export const OAUTH_CONFIG = {
  /** Authorization code sống rất ngắn và dùng đúng một lần (RFC 6749 khuyến
   * nghị tối đa 10 phút; 60s là đủ cho một vòng redirect). */
  CODE_TTL_SECONDS: SECONDS_PER_MINUTE,
  CODE_RANDOM_BYTES: 32,
  /** Request authorize đang chờ user đăng nhập. */
  PENDING_REQUEST_TTL_SECONDS: 10 * SECONDS_PER_MINUTE,
  PENDING_REQUEST_RANDOM_BYTES: 16,
  /** Token phát cho app vệ tinh ngắn hơn token first-party (8h) — badminton
   * không giữ refresh token nên đây cũng là bán kính ảnh hưởng khi logout. */
  ACCESS_TOKEN_TTL: "15m",
  ID_TOKEN_TTL: "15m",
  ACCESS_TOKEN_TTL_SECONDS: 15 * SECONDS_PER_MINUTE,
  NONCE_MAX_LENGTH: 255,
  STATE_MAX_LENGTH: 512,
  CODE_CHALLENGE_MAX_LENGTH: 128
} as const;

export const OAUTH_RESPONSE_TYPE = "code" as const;
export const OAUTH_GRANT_TYPE_AUTHORIZATION_CODE =
  "authorization_code" as const;
export const OAUTH_CODE_CHALLENGE_METHOD = "S256" as const;
export const OAUTH_TOKEN_TYPE = "Bearer" as const;

export const OAUTH_PROMPT = {
  NONE: "none",
  LOGIN: "login"
} as const;

/**
 * Mã lỗi theo RFC 6749 §4.1.2.1 / §5.2 và OIDC Core §3.1.2.6. Đây là giá trị
 * đi trong field `error` của response OAuth — KHÔNG phải ERROR_CODES nội bộ.
 */
export const OAUTH_ERRORS = {
  INVALID_REQUEST: "invalid_request",
  UNAUTHORIZED_CLIENT: "unauthorized_client",
  ACCESS_DENIED: "access_denied",
  UNSUPPORTED_RESPONSE_TYPE: "unsupported_response_type",
  INVALID_SCOPE: "invalid_scope",
  SERVER_ERROR: "server_error",
  INVALID_CLIENT: "invalid_client",
  INVALID_GRANT: "invalid_grant",
  UNSUPPORTED_GRANT_TYPE: "unsupported_grant_type",
  LOGIN_REQUIRED: "login_required",
  CONSENT_REQUIRED: "consent_required",
  INTERACTION_REQUIRED: "interaction_required"
} as const;

export const OAUTH_SCOPES = {
  OPENID: "openid",
  PROFILE: "profile",
  EMAIL: "email"
} as const;

export const OAUTH_SUPPORTED_SCOPES: string[] = [
  OAUTH_SCOPES.OPENID,
  OAUTH_SCOPES.PROFILE,
  OAUTH_SCOPES.EMAIL
];

/** Claim nào thuộc scope nào — dùng chung cho id_token và /oauth/userinfo. */
export const OAUTH_SCOPE_CLAIMS: Record<string, string[]> = {
  [OAUTH_SCOPES.PROFILE]: ["name", "picture"],
  [OAUTH_SCOPES.EMAIL]: ["email", "email_verified"]
};
