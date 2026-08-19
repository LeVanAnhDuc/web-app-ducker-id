export enum EmailType {
  LOGIN_OTP = "LOGIN_OTP",
  SIGNUP_OTP = "SIGNUP_OTP",
  MAGIC_LINK = "MAGIC_LINK",
  UNLOCK_TEMP_PASSWORD = "UNLOCK_TEMP_PASSWORD",
  FORGOT_PASSWORD_OTP = "FORGOT_PASSWORD_OTP",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  ADMIN_RESET_PASSWORD = "ADMIN_RESET_PASSWORD"
}

export interface LoginOtpData {
  otp: string;
  expiryMinutes: number;
}

export interface SignupOtpData {
  otp: string;
  expiryMinutes: number;
}

export interface MagicLinkData {
  magicLinkUrl: string;
  expiryMinutes: number;
}

export interface ForgotPasswordOtpData {
  otp: string;
  expiryMinutes: number;
}

export interface UnlockTempPasswordData {
  tempPassword: string;
  loginUrl: string;
}

export interface PasswordChangedData {
  changedAt: string;
  ipAddress: string;
}

export interface AdminResetPasswordData {
  tempPassword: string;
  loginUrl: string;
}

export interface EmailDataMap {
  [EmailType.LOGIN_OTP]: LoginOtpData;
  [EmailType.SIGNUP_OTP]: SignupOtpData;
  [EmailType.MAGIC_LINK]: MagicLinkData;
  [EmailType.UNLOCK_TEMP_PASSWORD]: UnlockTempPasswordData;
  [EmailType.FORGOT_PASSWORD_OTP]: ForgotPasswordOtpData;
  [EmailType.PASSWORD_CHANGED]: PasswordChangedData;
  [EmailType.ADMIN_RESET_PASSWORD]: AdminResetPasswordData;
}

export interface SendEmailOptions<T extends EmailType> {
  email: string;
  data: EmailDataMap[T];
  locale?: I18n.Locale;
}

export interface Mailer {
  send<T extends EmailType>(type: T, options: SendEmailOptions<T>): void;
  executeSend(
    type: EmailType,
    options: { email: string; data: Record<string, unknown>; locale?: string }
  ): Promise<void>;
}
