// types
import type { CookieOptions } from "express";
// others
import ENV from "@/constants/env";
import { SECONDS_PER_DAY } from "@/constants/time";

export const REFRESH_TOKEN = "refreshToken";

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: "8h",
  REFRESH_TOKEN: "7day",
  ID_TOKEN: "8h",
  NUMBER_ACCESS_TOKEN: 8 * 60 * 60 * 1000,
  NUMBER_REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000
} as const;

export const REFRESH_TOKEN_CONFIG = {
  IP_MAX_LENGTH: 45,
  TOKEN_HASH_MAX_LENGTH: 255,
  TTL_SECONDS: 7 * SECONDS_PER_DAY
} as const;

export const TOKEN_ERRORS = {
  TOKEN_EXPIRED_ERROR: "TokenExpiredError",
  JSON_WEB_TOKEN_ERROR: "JsonWebTokenError"
} as const;

const allowCrossOrigin = ENV.ALLOW_CROSS_ORIGIN_COOKIES === "true";

export const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: allowCrossOrigin || ENV.NODE_ENV === "production",
  sameSite: allowCrossOrigin ? "none" : "lax",
  maxAge: TOKEN_EXPIRY.NUMBER_REFRESH_TOKEN,
  path: "/"
} as const;
