// types
import type { RedisClientType } from "redis";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { generateSecureToken } from "@/utils/crypto/secure-token";
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { Logger } from "@/libs/logger";
import { FORGOT_PASSWORD_RESET_TOKEN_CONFIG } from "../constants";
import { SECONDS_PER_MINUTE } from "@/constants/time";
import { FORGOT_PASSWORD } from "@/constants/redis/store";

const KEY = FORGOT_PASSWORD.RESET_TOKEN;

export type ResetTokenRepository = {
  readonly RESET_TOKEN_EXPIRY_SECONDS: number;
  createToken(): string;
  storeHashed(email: string, token: string): Promise<void>;
  verify(email: string, token: string): Promise<boolean>;
  clear(email: string): Promise<void>;
  createAndStore(email: string): Promise<string>;
};

export class RedisResetTokenRepository implements ResetTokenRepository {
  readonly RESET_TOKEN_EXPIRY_SECONDS =
    FORGOT_PASSWORD_RESET_TOKEN_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE;

  constructor(private readonly client: RedisClientType) {}

  private resetTokenKey(email: string): string {
    return buildKey(KEY, email);
  }

  createToken(): string {
    return generateSecureToken(FORGOT_PASSWORD_RESET_TOKEN_CONFIG.TOKEN_LENGTH);
  }

  async storeHashed(email: string, token: string): Promise<void> {
    const key = this.resetTokenKey(email);
    const hashedToken = hashValue(token);
    await this.client.setEx(key, this.RESET_TOKEN_EXPIRY_SECONDS, hashedToken);
  }

  async verify(email: string, token: string): Promise<boolean> {
    const key = this.resetTokenKey(email);
    const storedHash = await this.client.get(key);

    if (!storedHash) return false;

    return isValidHashedValue(token, storedHash);
  }

  async clear(email: string): Promise<void> {
    const key = this.resetTokenKey(email);
    await this.client.del(key);
  }

  async createAndStore(email: string): Promise<string> {
    const token = this.createToken();

    await this.clear(email);
    await this.storeHashed(email, token);

    Logger.debug("Reset token created and stored", {
      email,
      expiresInSeconds: this.RESET_TOKEN_EXPIRY_SECONDS
    });

    return token;
  }
}
