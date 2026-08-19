// types
import type { RedisClientType } from "redis";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { getSecondsUntilMidnightUTC } from "../helpers";
import { LOGIN_LOCKOUT } from "../constants";
import { LOGIN } from "@/constants/redis/store";

const KEYS = {
  FAILED_ATTEMPTS: LOGIN.FAILED_ATTEMPTS,
  LOCKOUT: LOGIN.LOCKOUT
};

export type FailedAttemptsRepository = {
  readonly MAX_REQUESTS_PER_HOUR?: number;
  getCount(email: string): Promise<number>;
  trackAttempt(
    email: string
  ): Promise<{ attemptCount: number; lockoutSeconds: number }>;
  resetAll(email: string): Promise<void>;
  checkLockout(
    email: string
  ): Promise<{ isLocked: boolean; remainingSeconds: number }>;
};

export class RedisFailedAttemptsRepository implements FailedAttemptsRepository {
  constructor(private readonly client: RedisClientType) {}

  private failedAttemptsKey(email: string): string {
    return buildKey(KEYS.FAILED_ATTEMPTS, email);
  }

  private lockoutKey(email: string): string {
    return buildKey(KEYS.LOCKOUT, email);
  }

  async getCount(email: string): Promise<number> {
    const key = this.failedAttemptsKey(email);
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async trackAttempt(
    email: string
  ): Promise<{ attemptCount: number; lockoutSeconds: number }> {
    const attemptsKey = this.failedAttemptsKey(email);
    const lockoutKey = this.lockoutKey(email);

    const attemptCount = await this.client.incr(attemptsKey);

    if (attemptCount === 1) {
      await this.client.expire(attemptsKey, getSecondsUntilMidnightUTC());
    }

    const { MAX_ATTEMPTS, LOCKOUT_SECONDS } = LOGIN_LOCKOUT;
    const lockoutSeconds = attemptCount >= MAX_ATTEMPTS ? LOCKOUT_SECONDS : 0;

    if (lockoutSeconds > 0) {
      await this.client.setEx(
        lockoutKey,
        lockoutSeconds,
        attemptCount.toString()
      );
    }

    return { attemptCount, lockoutSeconds };
  }

  async resetAll(email: string): Promise<void> {
    await Promise.all([
      this.client.del(this.failedAttemptsKey(email)),
      this.client.del(this.lockoutKey(email))
    ]);
  }

  async checkLockout(
    email: string
  ): Promise<{ isLocked: boolean; remainingSeconds: number }> {
    const key = this.lockoutKey(email);
    const ttl = await this.client.ttl(key);

    if (ttl > 0) {
      return { isLocked: true, remainingSeconds: ttl };
    }

    return { isLocked: false, remainingSeconds: 0 };
  }
}
