// types
import type { SessionRecord } from "../types";
import type { SessionRepository } from "../repository/session.repository";

export const resolve = async (
  repo: SessionRepository,
  sid: string | null
): Promise<SessionRecord | null> => {
  if (!sid) return null;
  return repo.findBySid(sid);
};
