// types
import type { RedisClientType } from "redis";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { TTL_KEY_MISSING, TTL_NO_EXPIRY } from "@/constants/redis/ttl";
import { LOGIN } from "@/constants/redis/store";

const KEYS = {
  UNLOCK_TOKEN: LOGIN.UNLOCK_TOKEN,
  COOLDOWN: LOGIN.UNLOCK_COOLDOWN,
  RATE: LOGIN.UNLOCK_RATE
};

const COOLDOWN_SECONDS = 60;
const RATE_LIMIT_WINDOW_SECONDS = 3600;
const MAX_REQUESTS_PER_HOUR = 3;

export type UnlockAccountRepository = {
  readonly COOLDOWN_SECONDS: number;
  readonly MAX_REQUESTS_PER_HOUR: number;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string): Promise<void>;
  incrementRequestCount(email: string): Promise<number>;
  hasExceededRateLimit(requestCount: number): boolean;
};

export class RedisUnlockAccountRepository implements UnlockAccountRepository {
  readonly COOLDOWN_SECONDS = COOLDOWN_SECONDS;
  readonly MAX_REQUESTS_PER_HOUR = MAX_REQUESTS_PER_HOUR;

  constructor(private readonly client: RedisClientType) {}

  private unlockTokenKey(email: string): string {
    return buildKey(KEYS.UNLOCK_TOKEN, email);
  }

  private cooldownKey(email: string): string {
    return buildKey(KEYS.COOLDOWN, email);
  }

  private rateKey(email: string): string {
    return buildKey(KEYS.RATE, email);
  }

  async getCooldownRemaining(email: string): Promise<number> {
    const key = this.cooldownKey(email);
    const ttl = await this.client.ttl(key);

    if (ttl === TTL_KEY_MISSING) return 0;
    if (ttl === TTL_NO_EXPIRY) return this.COOLDOWN_SECONDS;
    return ttl;
  }

  async setCooldown(email: string): Promise<void> {
    const key = this.cooldownKey(email);
    await this.client.setEx(key, COOLDOWN_SECONDS, "1");
  }

  async incrementRequestCount(email: string): Promise<number> {
    const key = this.rateKey(email);
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    return count;
  }

  hasExceededRateLimit(requestCount: number): boolean {
    return requestCount > MAX_REQUESTS_PER_HOUR;
  }
}
