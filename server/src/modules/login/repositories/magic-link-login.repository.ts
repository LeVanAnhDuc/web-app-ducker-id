// types
import type { RedisClientType } from "redis";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { TTL_KEY_MISSING, TTL_NO_EXPIRY } from "@/constants/redis/ttl";
import { generateSecureToken } from "@/utils/crypto/secure-token";
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { Logger } from "@/libs/logger";
import { MAGIC_LINK_CONFIG } from "../constants";
import { SECONDS_PER_MINUTE } from "@/constants/time";
import { LOGIN } from "@/constants/redis/store";

const KEYS = {
  MAGIC_LINK: LOGIN.MAGIC_LINK,
  COOLDOWN: LOGIN.MAGIC_LINK_COOLDOWN
};

export type MagicLinkLoginRepository = {
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
};

export class RedisMagicLinkLoginRepository implements MagicLinkLoginRepository {
  readonly MAGIC_LINK_EXPIRY_SECONDS =
    MAGIC_LINK_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE;
  readonly MAGIC_LINK_COOLDOWN_SECONDS = MAGIC_LINK_CONFIG.COOLDOWN_SECONDS;

  constructor(private readonly client: RedisClientType) {}

  private magicLinkKey(email: string): string {
    return buildKey(KEYS.MAGIC_LINK, email);
  }

  private cooldownKey(email: string): string {
    return buildKey(KEYS.COOLDOWN, email);
  }

  createToken(): string {
    return generateSecureToken(MAGIC_LINK_CONFIG.TOKEN_LENGTH);
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

  async createAndStoreToken(email: string): Promise<string> {
    const token = this.createToken();

    await this.clearToken(email);
    await this.storeHashed(email, token, this.MAGIC_LINK_EXPIRY_SECONDS);

    Logger.debug("Magic link created and stored", {
      email,
      expiresInSeconds: this.MAGIC_LINK_EXPIRY_SECONDS
    });

    return token;
  }

  async setCooldownAfterSend(email: string): Promise<void> {
    await this.setCooldown(email, this.MAGIC_LINK_COOLDOWN_SECONDS);

    Logger.debug("Magic link cooldown set", {
      email,
      cooldownSeconds: this.MAGIC_LINK_COOLDOWN_SECONDS
    });
  }

  async cleanupAll(email: string): Promise<void> {
    await Promise.all([this.clearToken(email), this.clearCooldown(email)]);
  }
}
