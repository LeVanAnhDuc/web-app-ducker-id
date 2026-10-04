// types
import type { SessionRepository } from "../repository/session.repository";

export const registerClient = async (
  repo: SessionRepository,
  sid: string,
  clientId: string
): Promise<void> => {
  await repo.addClient(sid, clientId);
};
