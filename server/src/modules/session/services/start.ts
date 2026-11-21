// types
import type { SessionRecord } from "../types";
import type { SessionRepository } from "../repository/session.repository";
// others
import { Logger } from "@/libs/logger";
import { MILLISECONDS_PER_SECOND } from "@/constants/time";
import { RequestContext } from "@/utils/request-context";

/** The caller sets the `sid` cookie from the returned record. */
export const start = async (
  repo: SessionRepository,
  params: {
    authId: string;
    userId: string;
    roles: string;
  }
): Promise<SessionRecord> => {
  const { authId, userId, roles } = params;
  const { ip, userAgent } = RequestContext.getClient();

  const record = await repo.create({
    authId,
    userId,
    roles,
    authTime: Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
    ip,
    userAgent
  });

  Logger.info("IdP session started", { userId, sid: record.sid });

  return record;
};
