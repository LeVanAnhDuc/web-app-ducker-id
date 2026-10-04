export interface MagicLinkLoginRepository {
  readonly MAGIC_LINK_EXPIRY_SECONDS: number;
  readonly MAGIC_LINK_COOLDOWN_SECONDS: number;
  createToken(): string;
  storeHashed(email: string, token: string, expiry: number): Promise<void>;
  verifyToken(email: string, token: string): Promise<boolean>;
  clearToken(email: string): Promise<void>;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string, seconds: number): Promise<void>;
  clearCooldown(email: string): Promise<void>;
  createAndStoreToken(email: string): Promise<string>;
  setCooldownAfterSend(email: string): Promise<void>;
  cleanupAll(email: string): Promise<void>;
}
