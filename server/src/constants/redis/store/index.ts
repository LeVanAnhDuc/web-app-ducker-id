export const SIGNUP = {
  OTP: "otp-signup",
  OTP_COOLDOWN: "otp-signup-cooldown",
  OTP_FAILED_ATTEMPTS: "otp-signup-failed-attempts",
  OTP_RESEND_COUNT: "otp-signup-resend-count",
  SESSION: "session-signup"
};

export const LOGIN = {
  FAILED_ATTEMPTS: "login-failed-attempts",
  LOCKOUT: "login-lockout",
  OTP: "otp-login",
  OTP_COOLDOWN: "otp-login-cooldown",
  OTP_FAILED_ATTEMPTS: "otp-login-failed-attempts",
  OTP_RESEND_COUNT: "otp-login-resend-count",
  MAGIC_LINK: "magic-link-login",
  MAGIC_LINK_COOLDOWN: "magic-link-login-cooldown",
  UNLOCK_TOKEN: "login-unlock-token",
  UNLOCK_RATE: "unlock-rate",
  UNLOCK_COOLDOWN: "unlock-cooldown"
};

export const FORGOT_PASSWORD = {
  OTP: "otp-forgot-pw",
  OTP_COOLDOWN: "otp-forgot-pw-cd",
  OTP_FAILED_ATTEMPTS: "otp-forgot-pw-fail",
  OTP_RESEND_COUNT: "otp-forgot-pw-resend",
  MAGIC_LINK: "ml-forgot-pw",
  MAGIC_LINK_COOLDOWN: "ml-forgot-pw-cd",
  MAGIC_LINK_RESEND_COUNT: "ml-forgot-pw-resend",
  RESET_TOKEN: "reset-token"
};
