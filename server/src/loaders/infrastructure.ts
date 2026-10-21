// types
import type { RedisClientType } from "redis";
// common
import { RedisError } from "@/common/exceptions";
// database
import { connectMongo, disconnectMongo } from "@/database/mongodb";
import { createRedisClient } from "@/database/redis";
// others
import config from "@/constants/env";
import { initSigningKeys } from "@/libs/jwks";
import { Logger } from "@/libs/logger";

export interface Infrastructure {
  redis: RedisClientType;
  close: () => Promise<void>;
}

export const connectInfrastructure = async (): Promise<Infrastructure> => {
  await connectMongo();
  Logger.info("MongoDB connected");

  if (!config.redis.url) {
    throw new RedisError({ message: "REDIS_URL is required" });
  }
  const redis = createRedisClient();
  await redis.connect();
  Logger.info("Redis connected");

  initSigningKeys();

  return {
    redis,
    close: async () => {
      await disconnectMongo();
      await redis.disconnect();
      Logger.info("MongoDB and Redis connections closed");
    }
  };
};
