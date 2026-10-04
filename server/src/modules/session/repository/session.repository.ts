// types
import type { CreateSessionInput, SessionRecord } from "../types";

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<SessionRecord>;
  findBySid(sid: string): Promise<SessionRecord | null>;
  addClient(sid: string, clientId: string): Promise<void>;
  destroy(sid: string): Promise<void>;
}
