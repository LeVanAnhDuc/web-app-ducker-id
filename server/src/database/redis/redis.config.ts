// types
import type { RedisClientOptions } from "redis";
// others
import config from "@/constants/env";
import { Logger } from "@/libs/logger";

export const REDIS_CONNECT_TIMEOUT = 10000;

export const buildRedisConfig = (): RedisClientOptions | null => {
  if (config.REDIS_URL) {
    return {
      url: config.REDIS_URL,
      socket: {
        connectTimeout: REDIS_CONNECT_TIMEOUT,
        reconnectStrategy(retries, cause) {
          if (retries > 10) {
            Logger.error("Redis max reconnect attempts reached", {
              retries,
              last_cause: cause?.message
            });

            return new Error("Max retries reached");
          }

          const delay = Math.min(retries * 100, 2000);
          Logger.warn("Redis reconnecting...", {
            attempt: retries + 1,
            delay_ms: delay,
            cause: cause?.message
          });
          return delay;
        }
      }
    };
  }

  if (config.REDIS_HOST && config.REDIS_PORT) {
    return {
      socket: {
        host: config.REDIS_HOST,
        port: Number(config.REDIS_PORT),
        connectTimeout: REDIS_CONNECT_TIMEOUT,
        reconnectStrategy(retries, cause) {
          if (retries > 10) {
            Logger.error("Redis max reconnect attempts reached", {
              retries,
              last_cause: cause?.message
            });

            return new Error("Max retries reached");
          }

          const delay = Math.min(retries * 100, 2000);
          Logger.warn("Redis reconnecting...", {
            attempt: retries + 1,
            delay_ms: delay,
            cause: cause?.message
          });
          return delay;
        }
      },
      username: config.REDIS_USERNAME,
      password: config.REDIS_PASSWORD
    };
  }

  return null;
};
