// types
import type { SessionRecord } from "./types";
import type { SessionRepository } from "./repository/session.repository";
// others
import { Logger } from "@/libs/logger";
import { MILLISECONDS_PER_SECOND } from "@/constants/time";
import { RequestContext } from "@/utils/request-context";

/**
 * Knows sessions, not cookies: callers read the `sid` cookie with
 * `readSid` (`../helpers`) and set or clear it with `SESSION_COOKIE*`.
 */
export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  /** The caller sets the `sid` cookie from the returned record. */
  async start(params: {
    authId: string;
    userId: string;
    roles: string;
  }): Promise<SessionRecord> {
    const { authId, userId, roles } = params;
    const { ip, userAgent } = RequestContext.getClient();

    const record = await this.repo.create({
      authId,
      userId,
      roles,
      authTime: Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
      ip,
      userAgent
    });

    Logger.info("IdP session started", { userId, sid: record.sid });

    return record;
  }

  async resolve(sid: string | null): Promise<SessionRecord | null> {
    if (!sid) return null;
    return this.repo.findBySid(sid);
  }

  async registerClient(sid: string, clientId: string): Promise<void> {
    await this.repo.addClient(sid, clientId);
  }

  /** The caller clears the `sid` cookie whether or not there was a session. */
  async end(sid: string | null): Promise<void> {
    if (!sid) return;

    await this.repo.destroy(sid);
    Logger.info("IdP session ended", { sid });
  }
}
