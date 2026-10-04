// types
import type { RedisClientType } from "redis";
// others
import { RedisSessionRepository } from "./session.repository";
import { SessionService } from "./session.service";

export const createSessionModule = (redisClient: RedisClientType) => {
  const sessionRepo = new RedisSessionRepository(redisClient);
  const sessionService = new SessionService(sessionRepo);

  return { sessionRepository: sessionRepo, sessionService };
};
