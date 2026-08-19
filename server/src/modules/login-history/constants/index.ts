// others
import {
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY
} from "@/constants/time";

export const LOGIN_METHODS = {
  PASSWORD: "password",
  OTP: "otp",
  MAGIC_LINK: "magic-link",
  FORGOT_PASSWORD: "forgot-password"
} as const;

export const LOGIN_STATUSES = {
  SUCCESS: "success",
  FAILED: "failed"
} as const;

export const LOGIN_FAIL_REASONS = {
  INVALID_CREDENTIALS: "invalid_credentials",
  INVALID_PASSWORD: "invalid_password",
  ACCOUNT_LOCKED: "account_locked",
  ACCOUNT_INACTIVE: "account_inactive",
  EMAIL_NOT_VERIFIED: "email_not_verified",
  INVALID_OTP: "invalid_otp",
  OTP_EXPIRED: "otp_expired",
  INVALID_MAGIC_LINK: "invalid_magic_link",
  MAGIC_LINK_EXPIRED: "magic_link_expired",
  RATE_LIMITED: "rate_limited",
  PASSWORDLESS_ACCOUNT: "passwordless_account",
  INVALID_RESET_TOKEN: "invalid_reset_token"
} as const;

export const DEVICE_TYPES = {
  DESKTOP: "DESKTOP",
  MOBILE: "MOBILE",
  TABLET: "TABLET",
  UNKNOWN: "UNKNOWN"
} as const;

export const CLIENT_TYPES = {
  WEB: "WEB",
  MOBILE_IOS: "MOBILE_IOS",
  MOBILE_ANDROID: "MOBILE_ANDROID"
} as const;

export const LOGIN_HISTORY_SORT_BY_USER = [
  "createdAt",
  "method",
  "status",
  "country"
] as const;

export const LOGIN_HISTORY_SORT_BY_ADMIN = [
  "createdAt",
  "method",
  "status",
  "country",
  "ip",
  "usernameAttempted"
] as const;

export const GEO_DEFAULTS = {
  UNKNOWN_COUNTRY: "UNKNOWN",
  UNKNOWN_CITY: "UNKNOWN",
  UNKNOWN_IP: "UNKNOWN",
  LOCAL: "LOCAL"
} as const;

export const USER_AGENT_DEFAULTS = {
  UNKNOWN_DEVICE: "UNKNOWN",
  UNKNOWN_OS: "UNKNOWN",
  UNKNOWN_BROWSER: "UNKNOWN"
} as const;

export const HTTP_HEADERS = {
  USER_AGENT: "user-agent",
  CLIENT_TYPE: "x-client-type"
} as const;

export const LOGIN_HISTORY_CONFIG = {
  RETENTION_DAYS: 90,
  TTL_SECONDS: 90 * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE,
  MAX_ANOMALY_REASONS: 20
} as const;

export const LOGIN_HISTORY_STATS = {
  DEFAULT_RANGE_DAYS: 30
} as const;

export const LOCALHOST_VALUES = ["localhost", "0.0.0.0"] as const;

export const PRIVATE_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local
  /^::1$/, // IPv6 loopback
  /^fe80:/, // IPv6 link-local
  /^fc00:/, // IPv6 private
  /^fd00:/ // IPv6 private
] as const;
