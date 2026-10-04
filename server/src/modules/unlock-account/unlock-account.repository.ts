// types
import type { RedisClientType } from "redis";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { TTL_KEY_MISSING, TTL_NO_EXPIRY } from "@/constants/redis/ttl";
import { SECONDS_PER_MINUTE } from "@/constants/time";
import { LOGIN } from "@/constants/redis/store";
import { UNLOCK_ACCOUNT_CONFIG } from "./constants";

const KEYS = {
  UNLOCK_TOKEN: LOGIN.UNLOCK_TOKEN,
  COOLDOWN: LOGIN.UNLOCK_COOLDOWN,
  RATE: LOGIN.UNLOCK_RATE
};

const {
  TEMP_PASSWORD_EXPIRY_MINUTES,
  COOLDOWN_SECONDS,
  RATE_LIMIT_WINDOW_SECONDS,
  MAX_REQUESTS_PER_HOUR
} = UNLOCK_ACCOUNT_CONFIG;

const REDIS_DELETED_ONE = 1;

export type UnlockAccountRepository = {
  readonly COOLDOWN_SECONDS: number;
  readonly MAX_REQUESTS_PER_HOUR: number;
  readonly TEMP_PASSWORD_EXPIRY_SECONDS: number;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string): Promise<void>;
  incrementRequestCount(email: string): Promise<number>;
  hasExceededRateLimit(requestCount: number): boolean;
  storeTempPassword(email: string, tempPassword: string): Promise<void>;
  consumeTempPassword(email: string, tempPassword: string): Promise<boolean>;
};

export class RedisUnlockAccountRepository implements UnlockAccountRepository {
  readonly COOLDOWN_SECONDS = COOLDOWN_SECONDS;
  readonly MAX_REQUESTS_PER_HOUR = MAX_REQUESTS_PER_HOUR;
  readonly TEMP_PASSWORD_EXPIRY_SECONDS =
    TEMP_PASSWORD_EXPIRY_MINUTES * SECONDS_PER_MINUTE;

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

  /**
   * Chỉ hash được lưu; bản rõ chỉ đi qua email. TTL của key chính là hạn dùng
   * của mật khẩu tạm — không cần field hạn riêng, và hết hạn thì key tự biến mất.
   */
  async storeTempPassword(email: string, tempPassword: string): Promise<void> {
    const key = this.unlockTokenKey(email);
    await this.client.setEx(
      key,
      this.TEMP_PASSWORD_EXPIRY_SECONDS,
      hashValue(tempPassword)
    );
  }

  /**
   * Verify kèm consume một lần.
   *
   * Dùng GET rồi mới DEL chứ không GETDEL: GETDEL xoá key cả khi mã nhập sai,
   * nên bất kỳ ai biết email cũng đốt được mã hợp lệ của nạn nhân bằng một lần
   * đoán bừa. Ở đây đoán sai không mất mã, còn khi đoán đúng thì DEL quyết định
   * ai thắng — hai request song song cùng mã đúng chỉ có một request nhận được
   * giá trị trả về 1.
   */
  async consumeTempPassword(
    email: string,
    tempPassword: string
  ): Promise<boolean> {
    const key = this.unlockTokenKey(email);
    const storedHash = await this.client.get(key);

    if (!storedHash) return false;
    if (!isValidHashedValue(tempPassword, storedHash)) return false;

    const deleted = await this.client.del(key);
    return deleted === REDIS_DELETED_ONE;
  }
}
