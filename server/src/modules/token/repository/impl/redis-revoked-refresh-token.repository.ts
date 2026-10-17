// libs
import crypto from "crypto";
// types
import type { RedisClientType } from "redis";
import type { RevokedRefreshTokenRepository } from "../revoked-refresh-token.repository";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { TOKEN } from "@/constants/redis/store";

export class RedisRevokedRefreshTokenRepository implements RevokedRefreshTokenRepository {
  constructor(private readonly client: RedisClientType) {}

  /** Keyed by a SHA-256 of the token — the raw JWT never lands in Redis. */
  private key(token: string): string {
    const digest = crypto.createHash("sha256").update(token).digest("hex");
    return buildKey(TOKEN.REVOKED_REFRESH, digest);
  }

  async revoke(token: string, ttlSeconds: number): Promise<void> {
    await this.client.setEx(this.key(token), ttlSeconds, "1");
  }

  async isRevoked(token: string): Promise<boolean> {
    return (await this.client.exists(this.key(token))) === 1;
  }
}
