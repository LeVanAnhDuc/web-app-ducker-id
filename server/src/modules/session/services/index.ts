// types
import type { SessionRecord } from "../types";
import type { SessionRepository } from "../repository/session.repository";
// others
import { end } from "./end";
import { registerClient } from "./register-client";
import { resolve } from "./resolve";
import { start } from "./start";

/**
 * Knows sessions, not cookies: callers read the `sid` cookie with
 * `readSid` (`../helpers`) and set or clear it with `SESSION_COOKIE*`.
 */
export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  start(params: {
    authId: string;
    userId: string;
    roles: string;
  }): Promise<SessionRecord> {
    return start(this.repo, params);
  }

  resolve(sid: string | null): Promise<SessionRecord | null> {
    return resolve(this.repo, sid);
  }

  registerClient(sid: string, clientId: string): Promise<void> {
    return registerClient(this.repo, sid, clientId);
  }

  end(sid: string | null): Promise<void> {
    return end(this.repo, sid);
  }
}
