export interface UnlockAccountRepository {
  readonly COOLDOWN_SECONDS: number;
  readonly MAX_REQUESTS_PER_HOUR: number;
  readonly TEMP_PASSWORD_EXPIRY_SECONDS: number;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string): Promise<void>;
  incrementRequestCount(email: string): Promise<number>;
  hasExceededRateLimit(requestCount: number): boolean;
  storeTempPassword(email: string, tempPassword: string): Promise<void>;
  consumeTempPassword(email: string, tempPassword: string): Promise<boolean>;
}
