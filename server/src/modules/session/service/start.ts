// types
import type { Request, Response } from "express";
import type { SessionRecord } from "../types";
import type { SessionRepository } from "../repository/session.repository";
// others
import { Logger } from "@/libs/logger";
import { MILLISECONDS_PER_SECOND } from "@/constants/time";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../constants";

export const start = async (
  repo: SessionRepository,
  params: {
    authId: string;
    userId: string;
    roles: string;
    req: Request;
    res: Response;
  }
): Promise<SessionRecord> => {
  const { authId, userId, roles, req, res } = params;

  const record = await repo.create({
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
};
