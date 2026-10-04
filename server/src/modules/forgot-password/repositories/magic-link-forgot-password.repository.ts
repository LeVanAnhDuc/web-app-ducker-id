export interface MagicLinkForgotPasswordRepository {
  readonly MAGIC_LINK_EXPIRY_SECONDS: number;
  readonly MAGIC_LINK_COOLDOWN_SECONDS: number;
  createToken(): string;
  storeHashed(email: string, token: string, expiry: number): Promise<void>;
  verifyToken(email: string, token: string): Promise<boolean>;
  clearToken(email: string): Promise<void>;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string, seconds: number): Promise<void>;
  clearCooldown(email: string): Promise<void>;
  incrementResendCount(email: string, windowSeconds: number): Promise<number>;
  getResendAttemptCount(email: string): Promise<number>;
  clearResendCount(email: string): Promise<void>;
  hasExceededResendLimit(email: string): Promise<boolean>;
  createAndStoreToken(email: string): Promise<string>;
  setRateLimits(email: string): Promise<void>;
  cleanupAll(email: string): Promise<void>;
}
