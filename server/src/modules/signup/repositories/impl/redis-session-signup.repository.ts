// types
import type { RedisClientType } from "redis";
import type { SessionSignupRepository } from "../session-signup.repository";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { generateSecureToken } from "@/utils/crypto/secure-token";
import { SESSION_CONFIG } from "../../constants";
import { SIGNUP } from "@/constants/redis/store";

const KEYS = {
  SESSION: SIGNUP.SESSION
};

export class RedisSessionSignupRepository implements SessionSignupRepository {
  constructor(private readonly client: RedisClientType) {}

  private sessionKey(email: string): string {
    return buildKey(KEYS.SESSION, email);
  }

  createToken(): string {
    return generateSecureToken(SESSION_CONFIG.TOKEN_LENGTH);
  }

  async store(email: string, sessionId: string, expiry: number): Promise<void> {
    const key = this.sessionKey(email);
    await this.client.setEx(key, expiry, sessionId);
  }

  async createAndStore(email: string, expiry: number): Promise<string> {
    const token = this.createToken();
    await this.store(email, token, expiry);
    return token;
  }

  async verify(email: string, sessionId: string): Promise<boolean> {
    const key = this.sessionKey(email);
    const storedSessionId = await this.client.get(key);
    return storedSessionId === sessionId;
  }

  async clear(email: string): Promise<void> {
    const key = this.sessionKey(email);
    await this.client.del(key);
  }
}
