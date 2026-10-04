// types
import type { RedisClientType } from "redis";
import type { CreateSessionInput, SessionRecord } from "./types";
// others
import { buildKey } from "@/utils/redis/key-builder";
import { generateSecureToken } from "@/utils/crypto/secure-token";
import { SESSION } from "@/constants/redis/store";
import { SESSION_CONFIG } from "./constants";

export type SessionRepository = {
  create(input: CreateSessionInput): Promise<SessionRecord>;
  findBySid(sid: string): Promise<SessionRecord | null>;
  addClient(sid: string, clientId: string): Promise<void>;
  destroy(sid: string): Promise<void>;
};

export class RedisSessionRepository implements SessionRepository {
  constructor(private readonly client: RedisClientType) {}

  private key(sid: string): string {
    return buildKey(SESSION.IDP, sid);
  }

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const sid = generateSecureToken(SESSION_CONFIG.ID_RANDOM_BYTES);
    const record: SessionRecord = { ...input, sid, clients: [] };

    await this.client.setEx(
      this.key(sid),
      SESSION_CONFIG.TTL_SECONDS,
      JSON.stringify(record)
    );

    return record;
  }

  async findBySid(sid: string): Promise<SessionRecord | null> {
    const raw = await this.client.get(this.key(sid));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SessionRecord;
    } catch {
      await this.destroy(sid);
      return null;
    }
  }

  async addClient(sid: string, clientId: string): Promise<void> {
    const record = await this.findBySid(sid);
    if (!record) return;
    if (record.clients.includes(clientId)) return;
    if (record.clients.length >= SESSION_CONFIG.MAX_CLIENTS) return;

    record.clients.push(clientId);

    const ttl = await this.client.ttl(this.key(sid));
    if (ttl <= 0) return;

    await this.client.setEx(this.key(sid), ttl, JSON.stringify(record));
  }

  async destroy(sid: string): Promise<void> {
    await this.client.del(this.key(sid));
  }
}
