// types
import type { RedisClientType } from "redis";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { TTL_KEY_MISSING, TTL_NO_EXPIRY } from "@/constants/redis/ttl";
import { generateOtp } from "@/utils/crypto/otp";
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { Logger } from "@/libs/logger";
import { FORGOT_PASSWORD_OTP_CONFIG } from "../constants";
import { SECONDS_PER_MINUTE } from "@/constants/time";
import { FORGOT_PASSWORD } from "@/constants/redis/store";

const KEYS = {
  OTP: FORGOT_PASSWORD.OTP,
  COOLDOWN: FORGOT_PASSWORD.OTP_COOLDOWN,
  FAILED_ATTEMPTS: FORGOT_PASSWORD.OTP_FAILED_ATTEMPTS,
  RESEND_COUNT: FORGOT_PASSWORD.OTP_RESEND_COUNT
};

export type OtpForgotPasswordRepository = {
  readonly OTP_EXPIRY_SECONDS: number;
  readonly OTP_COOLDOWN_SECONDS: number;
  createOtp(): string;
  storeHashed(email: string, otp: string, expiry: number): Promise<void>;
  clearOtp(email: string): Promise<void>;
  verify(email: string, otp: string): Promise<boolean>;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string, seconds: number): Promise<void>;
  clearCooldown(email: string): Promise<void>;
  incrementFailedAttempts(email: string): Promise<number>;
  getFailedAttemptCount(email: string): Promise<number>;
  clearFailedAttempts(email: string): Promise<void>;
  isLocked(email: string): Promise<boolean>;
  incrementResendCount(email: string, windowSeconds: number): Promise<number>;
  getResendAttemptCount(email: string): Promise<number>;
  clearResendCount(email: string): Promise<void>;
  hasExceededResendLimit(email: string): Promise<boolean>;
  createAndStoreOtp(email: string): Promise<string>;
  setRateLimits(email: string): Promise<void>;
  cleanupAll(email: string): Promise<void>;
};

export class RedisOtpForgotPasswordRepository
  implements OtpForgotPasswordRepository
{
  readonly OTP_EXPIRY_SECONDS =
    FORGOT_PASSWORD_OTP_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE;
  readonly OTP_COOLDOWN_SECONDS = FORGOT_PASSWORD_OTP_CONFIG.COOLDOWN_SECONDS;

  constructor(private readonly client: RedisClientType) {}

  private otpKey(email: string): string {
    return buildKey(KEYS.OTP, email);
  }

  private cooldownKey(email: string): string {
    return buildKey(KEYS.COOLDOWN, email);
  }

  private failedAttemptsKey(email: string): string {
    return buildKey(KEYS.FAILED_ATTEMPTS, email);
  }

  private resendCountKey(email: string): string {
    return buildKey(KEYS.RESEND_COUNT, email);
  }

  createOtp(): string {
    return generateOtp(FORGOT_PASSWORD_OTP_CONFIG.LENGTH);
  }

  async storeHashed(email: string, otp: string, expiry: number): Promise<void> {
    const key = this.otpKey(email);
    const hashedOtp = hashValue(otp);
    await this.client.setEx(key, expiry, hashedOtp);
  }

  async clearOtp(email: string): Promise<void> {
    const key = this.otpKey(email);
    await this.client.del(key);
  }

  async verify(email: string, otp: string): Promise<boolean> {
    const key = this.otpKey(email);
    const hashedOtp = await this.client.get(key);

    if (!hashedOtp) return false;

    return isValidHashedValue(otp, hashedOtp);
  }

  async getCooldownRemaining(email: string): Promise<number> {
    const key = this.cooldownKey(email);
    const ttl = await this.client.ttl(key);

    if (ttl === TTL_KEY_MISSING) return 0;
    if (ttl === TTL_NO_EXPIRY) return this.OTP_COOLDOWN_SECONDS;
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

  async incrementFailedAttempts(email: string): Promise<number> {
    const key = this.failedAttemptsKey(email);
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(
        key,
        FORGOT_PASSWORD_OTP_CONFIG.LOCKOUT_DURATION_MINUTES * SECONDS_PER_MINUTE
      );
    }

    return count;
  }

  async getFailedAttemptCount(email: string): Promise<number> {
    const key = this.failedAttemptsKey(email);
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async clearFailedAttempts(email: string): Promise<void> {
    const key = this.failedAttemptsKey(email);
    await this.client.del(key);
  }

  async isLocked(email: string): Promise<boolean> {
    const attempts = await this.getFailedAttemptCount(email);
    return attempts >= FORGOT_PASSWORD_OTP_CONFIG.MAX_FAILED_ATTEMPTS;
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
    return resendCount >= FORGOT_PASSWORD_OTP_CONFIG.MAX_RESEND_ATTEMPTS;
  }

  async createAndStoreOtp(email: string): Promise<string> {
    const otp = this.createOtp();

    await this.clearOtp(email);
    await this.storeHashed(email, otp, this.OTP_EXPIRY_SECONDS);

    Logger.debug("Forgot password OTP created and stored", {
      email,
      expiresInSeconds: this.OTP_EXPIRY_SECONDS
    });

    return otp;
  }

  async setRateLimits(email: string): Promise<void> {
    await Promise.all([
      this.setCooldown(email, this.OTP_COOLDOWN_SECONDS),
      this.incrementResendCount(email, this.OTP_EXPIRY_SECONDS)
    ]);

    Logger.debug("Forgot password OTP rate limits applied", {
      email,
      cooldownSeconds: this.OTP_COOLDOWN_SECONDS
    });
  }

  async cleanupAll(email: string): Promise<void> {
    await Promise.all([
      this.clearOtp(email),
      this.clearCooldown(email),
      this.clearFailedAttempts(email),
      this.clearResendCount(email)
    ]);
  }
}
