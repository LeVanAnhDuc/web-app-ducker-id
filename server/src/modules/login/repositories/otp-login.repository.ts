export interface OtpLoginRepository {
  readonly OTP_EXPIRY_SECONDS: number;
  readonly OTP_COOLDOWN_SECONDS: number;
  createOtp(): string;
  storeHashed(email: string, otp: string, expiry: number): Promise<void>;
  clearOtp(email: string): Promise<void>;
  verify(email: string, otp: string): Promise<boolean>;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string, seconds: number): Promise<void>;
  clearCooldown(email: string): Promise<void>;
  incrementFailedAttempts(email: string): Promise<number>;
  getFailedAttemptCount(email: string): Promise<number>;
  clearFailedAttempts(email: string): Promise<void>;
  isLocked(email: string): Promise<boolean>;
  incrementResendCount(email: string, windowSeconds: number): Promise<number>;
  getResendAttemptCount(email: string): Promise<number>;
  clearResendCount(email: string): Promise<void>;
  hasExceededResendLimit(email: string): Promise<boolean>;
  createAndStoreOtp(email: string): Promise<string>;
  setRateLimits(email: string): Promise<void>;
  cleanupAll(email: string): Promise<void>;
}
