// others
import { SECONDS_PER_MINUTE, MINUTES_PER_HOUR } from "@/constants/time";

export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  MAX_RESEND_COUNT: 5
} as const;

export const SESSION_CONFIG = {
  EXPIRY_MINUTES: 30,
  TOKEN_LENGTH: 32
} as const;

/**
 * Giá trị dẫn xuất từ hai config trên. Trước đây chúng là hằng module-level
 * trong `signup.service.ts`; khi service tách ra nhiều file thì chỗ duy nhất
 * giữ được "một định nghĩa" là đây.
 */
export const OTP_EXPIRY_SECONDS =
  OTP_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE;
export const OTP_COOLDOWN_SECONDS = OTP_CONFIG.RESEND_COOLDOWN_SECONDS;
export const RESEND_WINDOW_SECONDS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
export const MAX_RESEND_COUNT = OTP_CONFIG.MAX_RESEND_COUNT;
export const MAX_FAILED_ATTEMPTS = OTP_CONFIG.MAX_FAILED_ATTEMPTS;
export const LOCKOUT_DURATION_MINUTES = OTP_CONFIG.LOCKOUT_DURATION_MINUTES;
export const SESSION_EXPIRY_SECONDS =
  SESSION_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE;
