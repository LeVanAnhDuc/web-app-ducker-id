// types
import type { SessionRepository } from "../repository/session.repository";
// others
import { Logger } from "@/libs/logger";

/** The caller clears the `sid` cookie whether or not there was a session. */
export const end = async (
  repo: SessionRepository,
  sid: string | null
): Promise<void> => {
  if (!sid) return;

  await repo.destroy(sid);
  Logger.info("IdP session ended", { sid });
};
