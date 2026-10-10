// types
import type { RedisClientType } from "redis";
// others
import { RedisSessionRepository } from "./repository/impl/redis-session.repository";
import { SessionService } from "./services";

export const createSessionModule = (redisClient: RedisClientType) => {
  const sessionRepo = new RedisSessionRepository(redisClient);
  const sessionService = new SessionService(sessionRepo);

  return { sessionRepository: sessionRepo, sessionService };
};
