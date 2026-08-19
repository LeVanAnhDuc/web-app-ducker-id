// types
import type { RedisClientType } from "redis";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { TTL_KEY_MISSING, TTL_NO_EXPIRY } from "@/constants/redis/ttl";
import { generateSecureToken } from "@/utils/crypto/secure-token";
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { Logger } from "@/libs/logger";
import { FORGOT_PASSWORD_MAGIC_LINK_CONFIG } from "../constants";
import { SECONDS_PER_MINUTE } from "@/constants/time";
import { FORGOT_PASSWORD } from "@/constants/redis/store";

const KEYS = {
  MAGIC_LINK: FORGOT_PASSWORD.MAGIC_LINK,
  COOLDOWN: FORGOT_PASSWORD.MAGIC_LINK_COOLDOWN,
  RESEND_COUNT: FORGOT_PASSWORD.MAGIC_LINK_RESEND_COUNT
};

export type MagicLinkForgotPasswordRepository = {
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
};

export class RedisMagicLinkForgotPasswordRepository
  implements MagicLinkForgotPasswordRepository
{
  readonly MAGIC_LINK_EXPIRY_SECONDS =
    FORGOT_PASSWORD_MAGIC_LINK_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE;
  readonly MAGIC_LINK_COOLDOWN_SECONDS =
    FORGOT_PASSWORD_MAGIC_LINK_CONFIG.COOLDOWN_SECONDS;

  constructor(private readonly client: RedisClientType) {}

  private magicLinkKey(email: string): string {
    return buildKey(KEYS.MAGIC_LINK, email);
  }

  private cooldownKey(email: string): string {
    return buildKey(KEYS.COOLDOWN, email);
  }

  private resendCountKey(email: string): string {
    return buildKey(KEYS.RESEND_COUNT, email);
  }

  createToken(): string {
    return generateSecureToken(FORGOT_PASSWORD_MAGIC_LINK_CONFIG.TOKEN_LENGTH);
  }

  async storeHashed(
    email: string,
    token: string,
    expiry: number
  ): Promise<void> {
    const key = this.magicLinkKey(email);
    const hashedToken = hashValue(token);
    await this.client.setEx(key, expiry, hashedToken);
  }

  async verifyToken(email: string, token: string): Promise<boolean> {
    const key = this.magicLinkKey(email);
    const storedHash = await this.client.get(key);

    if (!storedHash) return false;

    return isValidHashedValue(token, storedHash);
  }

  async clearToken(email: string): Promise<void> {
    const key = this.magicLinkKey(email);
    await this.client.del(key);
  }

  async getCooldownRemaining(email: string): Promise<number> {
    const key = this.cooldownKey(email);
    const ttl = await this.client.ttl(key);

    if (ttl === TTL_KEY_MISSING) return 0;
    if (ttl === TTL_NO_EXPIRY) return this.MAGIC_LINK_COOLDOWN_SECONDS;
    return ttl;
  }

  async setCooldown(email: string, seconds: number): Promise<void> {
    const key = this.cooldownKey(email);
    await this.client.setEx(key, seconds, "1");
  }

  async clearCooldown(email: string): Promise<void> {
    const key = this.cooldownKey(email);
    await this.client.del(key);
  }

  async incrementResendCount(
    email: string,
    windowSeconds: number
  ): Promise<number> {
    const key = this.resendCountKey(email);
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    return count;
  }

  async getResendAttemptCount(email: string): Promise<number> {
    const key = this.resendCountKey(email);
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async clearResendCount(email: string): Promise<void> {
    const key = this.resendCountKey(email);
    await this.client.del(key);
  }

  async hasExceededResendLimit(email: string): Promise<boolean> {
    const resendCount = await this.getResendAttemptCount(email);
    return resendCount >= FORGOT_PASSWORD_MAGIC_LINK_CONFIG.MAX_RESEND_ATTEMPTS;
  }

  async createAndStoreToken(email: string): Promise<string> {
    const token = this.createToken();

    await this.clearToken(email);
    await this.storeHashed(email, token, this.MAGIC_LINK_EXPIRY_SECONDS);

    Logger.debug("Forgot password magic link created and stored", {
      email,
      expiresInSeconds: this.MAGIC_LINK_EXPIRY_SECONDS
    });

    return token;
  }

  async setRateLimits(email: string): Promise<void> {
    await Promise.all([
      this.setCooldown(email, this.MAGIC_LINK_COOLDOWN_SECONDS),
      this.incrementResendCount(email, this.MAGIC_LINK_EXPIRY_SECONDS)
    ]);

    Logger.debug("Forgot password magic link rate limits applied", {
      email,
      cooldownSeconds: this.MAGIC_LINK_COOLDOWN_SECONDS
    });
  }

  async cleanupAll(email: string): Promise<void> {
    await Promise.all([
      this.clearToken(email),
      this.clearCooldown(email),
      this.clearResendCount(email)
    ]);
  }
}
