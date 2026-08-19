// types
import type { RedisClientType } from "redis";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { TTL_KEY_MISSING, TTL_NO_EXPIRY } from "@/constants/redis/ttl";
import { generateOtp } from "@/utils/crypto/otp";
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { OTP_CONFIG } from "../constants";
import { SIGNUP } from "@/constants/redis/store";

const KEYS = {
  OTP: SIGNUP.OTP,
  COOLDOWN: SIGNUP.OTP_COOLDOWN,
  FAILED_ATTEMPTS: SIGNUP.OTP_FAILED_ATTEMPTS,
  RESEND_COUNT: SIGNUP.OTP_RESEND_COUNT
};

export type OtpSignupRepository = {
  createOtp(): string;
  storeHashed(email: string, otp: string, expiry: number): Promise<void>;
  clearOtp(email: string): Promise<void>;
  createAndStoreOtp(email: string, expiry: number): Promise<string>;
  verify(email: string, otp: string): Promise<boolean>;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string, seconds: number): Promise<void>;
  clearCooldown(email: string): Promise<void>;
  incrementFailedAttempts(
    email: string,
    lockoutDurationMinutes: number
  ): Promise<number>;
  getFailedAttemptCount(email: string): Promise<number>;
  clearFailedAttempts(email: string): Promise<void>;
  isLocked(email: string, maxAttempts: number): Promise<boolean>;
  incrementResendCount(email: string, windowSeconds: number): Promise<number>;
  getResendAttemptCount(email: string): Promise<number>;
  clearResendCount(email: string): Promise<void>;
  hasExceededResendLimit(email: string, maxResends: number): Promise<boolean>;
  cleanupOtpData(email: string): Promise<void>;
};

export class RedisOtpSignupRepository implements OtpSignupRepository {
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
    return generateOtp(OTP_CONFIG.LENGTH);
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

  async createAndStoreOtp(email: string, expiry: number): Promise<string> {
    const otp = this.createOtp();
    await this.clearOtp(email);
    await this.storeHashed(email, otp, expiry);
    return otp;
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
    if (ttl === TTL_NO_EXPIRY) return OTP_CONFIG.RESEND_COOLDOWN_SECONDS;
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

  async incrementFailedAttempts(
    email: string,
    lockoutDurationMinutes: number
  ): Promise<number> {
    const key = this.failedAttemptsKey(email);
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, lockoutDurationMinutes * 60);
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

  async isLocked(email: string, maxAttempts: number): Promise<boolean> {
    const attempts = await this.getFailedAttemptCount(email);
    return attempts >= maxAttempts;
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

  async hasExceededResendLimit(
    email: string,
    maxResends: number
  ): Promise<boolean> {
    const resendCount = await this.getResendAttemptCount(email);
    return resendCount >= maxResends;
  }

  async cleanupOtpData(email: string): Promise<void> {
    await Promise.all([
      this.clearFailedAttempts(email),
      this.clearOtp(email),
      this.clearCooldown(email)
    ]);
  }
}
