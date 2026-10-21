// libs
import { createClient } from "redis";
// types
import type { RedisClientType } from "redis";
// others
import config from "@/constants/env";
import { Logger } from "@/libs/logger";

// Builds the client without connecting it. The one instance the app uses is
// created and connected by connectInfrastructure() and handed down from bootstrap().
export const createRedisClient = (): RedisClientType => {
  const { reconnect } = config.redis;

  const redis: RedisClientType = createClient({
    url: config.redis.url,
    socket: {
      connectTimeout: config.redis.timeout.connectMs,
      reconnectStrategy: (retries, cause) => {
        if (retries > reconnect.maxAttempts) {
          Logger.error("Redis max reconnect attempts reached", {
            retries,
            last_cause: cause?.message
          });
          return new Error("Max retries reached");
        }
        return Math.min(retries * reconnect.baseDelayMs, reconnect.maxDelayMs);
      }
    }
  });

  redis.on("reconnecting", () => Logger.warn("Redis reconnecting"));
  redis.on("end", () => Logger.warn("Redis connection ended"));
  redis.on("error", (error) => Logger.error("Redis error", error));

  return redis;
};

export const checkRedisHealth = async (
  redis: RedisClientType
): Promise<{ isHealthy: boolean; latency?: number }> => {
  if (!redis.isOpen) return { isHealthy: false };

  try {
    const startedAt = Date.now();
    await redis.ping();
    return { isHealthy: true, latency: Date.now() - startedAt };
  } catch (error) {
    Logger.error("Redis health check failed", error);
    return { isHealthy: false };
  }
};
