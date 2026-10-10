// types
import type { RedisClientType } from "redis";
import type { OAuthRepository } from "../oauth.repository";
import type {
  AuthorizationCodeRecord,
  PendingAuthorizeRequest
} from "../../types";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { generateSecureToken } from "@/utils/crypto/secure-token";
import { OAUTH } from "@/constants/redis/store";
import { OAUTH_CONFIG } from "../../constants";

export class RedisOAuthRepository implements OAuthRepository {
  constructor(private readonly client: RedisClientType) {}

  private codeKey(code: string): string {
    return buildKey(OAUTH.CODE, code);
  }

  private pendingKey(id: string): string {
    return buildKey(OAUTH.PENDING_REQUEST, id);
  }

  async storeCode(record: AuthorizationCodeRecord): Promise<string> {
    const code = generateSecureToken(OAUTH_CONFIG.CODE_RANDOM_BYTES);

    await this.client.setEx(
      this.codeKey(code),
      OAUTH_CONFIG.CODE_TTL_SECONDS,
      JSON.stringify(record)
    );

    return code;
  }

  /**
   * GETDEL là thao tác nguyên tử — đọc và xoá trong một lệnh. Đây là thứ đảm
   * bảo authorization code dùng đúng một lần kể cả khi hai request đổi token
   * chạy song song; tách thành GET rồi DEL sẽ để lọt race condition.
   */
  async consumeCode(code: string): Promise<AuthorizationCodeRecord | null> {
    const raw = await this.client.getDel(this.codeKey(code));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthorizationCodeRecord;
    } catch {
      return null;
    }
  }

  async storePendingRequest(request: PendingAuthorizeRequest): Promise<string> {
    const id = generateSecureToken(OAUTH_CONFIG.PENDING_REQUEST_RANDOM_BYTES);

    await this.client.setEx(
      this.pendingKey(id),
      OAUTH_CONFIG.PENDING_REQUEST_TTL_SECONDS,
      JSON.stringify(request)
    );

    return id;
  }

  async consumePendingRequest(
    id: string
  ): Promise<PendingAuthorizeRequest | null> {
    const raw = await this.client.getDel(this.pendingKey(id));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as PendingAuthorizeRequest;
    } catch {
      return null;
    }
  }
}
