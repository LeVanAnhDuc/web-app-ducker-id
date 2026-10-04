// types
import type { Request, Response } from "express";
import type { SessionRepository } from "../repository/session.repository";
// others
import { Logger } from "@/libs/logger";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../constants";
import { readSid } from "../helpers";

export const end = async (
  repo: SessionRepository,
  req: Request,
  res: Response
): Promise<void> => {
  const sid = readSid(req);

  if (sid) {
    await repo.destroy(sid);
    Logger.info("IdP session ended", { sid });
  }

  res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS);
};
