export interface OtpSignupRepository {
  createOtp(): string;
  storeHashed(email: string, otp: string, expiry: number): Promise<void>;
  clearOtp(email: string): Promise<void>;
  createAndStoreOtp(email: string, expiry: number): Promise<string>;
  verify(email: string, otp: string): Promise<boolean>;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string, seconds: number): Promise<void>;
  clearCooldown(email: string): Promise<void>;
  incrementFailedAttempts(
    email: string,
    lockoutDurationMinutes: number
  ): Promise<number>;
  getFailedAttemptCount(email: string): Promise<number>;
  clearFailedAttempts(email: string): Promise<void>;
  isLocked(email: string, maxAttempts: number): Promise<boolean>;
  incrementResendCount(email: string, windowSeconds: number): Promise<number>;
  getResendAttemptCount(email: string): Promise<number>;
  clearResendCount(email: string): Promise<void>;
  hasExceededResendLimit(email: string, maxResends: number): Promise<boolean>;
  cleanupOtpData(email: string): Promise<void>;
}
