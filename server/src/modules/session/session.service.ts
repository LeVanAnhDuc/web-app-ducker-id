// types
import type { Request, Response } from "express";
import type { SessionRepository } from "./session.repository";
import type { SessionRecord } from "./types";
// others
import { Logger } from "@/libs/logger";
import { MILLISECONDS_PER_SECOND } from "@/constants/time";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "./constants";

export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  async start(params: {
    authId: string;
    userId: string;
    roles: string;
    req: Request;
    res: Response;
  }): Promise<SessionRecord> {
    const { authId, userId, roles, req, res } = params;

    const record = await this.repo.create({
      authId,
      userId,
      roles,
      authTime: Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
      ip: req.ip ?? "",
      userAgent: req.get("user-agent") ?? ""
    });

    res.cookie(SESSION_COOKIE, record.sid, SESSION_COOKIE_OPTIONS);

    Logger.info("IdP session started", { userId, sid: record.sid });

    return record;
  }

  async resolve(req: Request): Promise<SessionRecord | null> {
    const sid = this.readSid(req);
    if (!sid) return null;
    return this.repo.findBySid(sid);
  }

  readSid(req: Request): string | null {
    const raw = (req.cookies as Record<string, string> | undefined)?.[
      SESSION_COOKIE
    ];
    return raw || null;
  }

  async registerClient(sid: string, clientId: string): Promise<void> {
    await this.repo.addClient(sid, clientId);
  }

  async end(req: Request, res: Response): Promise<void> {
    const sid = this.readSid(req);

    if (sid) {
      await this.repo.destroy(sid);
      Logger.info("IdP session ended", { sid });
    }

    res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS);
  }
}
