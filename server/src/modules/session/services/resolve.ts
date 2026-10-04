// types
import type { Request } from "express";
import type { SessionRecord } from "../types";
import type { SessionRepository } from "../repository/session.repository";
// others
import { readSid } from "../helpers";

export const resolve = async (
  repo: SessionRepository,
  req: Request
): Promise<SessionRecord | null> => {
  const sid = readSid(req);
  if (!sid) return null;
  return repo.findBySid(sid);
};
