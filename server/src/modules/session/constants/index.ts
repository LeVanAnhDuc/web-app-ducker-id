// types
import type { CookieOptions } from "express";
// others
import ENV from "@/constants/env";
import { SECONDS_PER_DAY } from "@/constants/time";

/** Tên cookie mang session của IdP. Khác refreshToken: cái này định danh PHIÊN
 * đăng nhập ở Ducker ID, không phải quyền phát lại token cho một client. */
export const SESSION_COOKIE = "sid";

export const SESSION_CONFIG = {
  /** Độ dài token ngẫu nhiên (bytes) dùng làm sid. */
  ID_RANDOM_BYTES: 32,
  /** Phiên sống 7 ngày, trùng với vòng đời refresh token first-party. */
  TTL_SECONDS: 7 * SECONDS_PER_DAY,
  /** Số client tối đa ghi nhận trên một phiên (chặn phình key Redis). */
  MAX_CLIENTS: 50
} as const;

const allowCrossOrigin = ENV.ALLOW_CROSS_ORIGIN_COOKIES === "true";

/**
 * SameSite=Lax là đủ cho SSO redirect: cookie Lax VẪN được gửi kèm trong
 * top-level GET navigation kể cả khác site — mà /oauth/authorize chính là một
 * navigation như vậy. Không cần SameSite=None nên không phụ thuộc third-party
 * cookie (thứ đang bị các trình duyệt chặn dần).
 */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: allowCrossOrigin || ENV.NODE_ENV === "production",
  sameSite: allowCrossOrigin ? "none" : "lax",
  maxAge: SESSION_CONFIG.TTL_SECONDS * 1000,
  path: "/"
} as const;
