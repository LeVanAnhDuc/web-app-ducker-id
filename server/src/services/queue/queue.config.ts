// types
import type { ConnectionOptions } from "bullmq";
// others
import config from "@/constants/env";
import { Logger } from "@/libs/logger";

const DEFAULT_REDIS_PORT = 6379;

const parseRedisUrl = (url: string): ConnectionOptions => {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : DEFAULT_REDIS_PORT,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null
  };
};

export const buildQueueConnection = (): ConnectionOptions | null => {
  if (config.REDIS_URL) {
    Logger.debug("Building BullMQ connection from REDIS_URL");
    return parseRedisUrl(config.REDIS_URL);
  }

  if (config.REDIS_HOST && config.REDIS_PORT) {
    return {
      host: config.REDIS_HOST,
      port: Number(config.REDIS_PORT),
      username: config.REDIS_USERNAME,
      password: config.REDIS_PASSWORD,
      maxRetriesPerRequest: null
    };
  }

  return null;
};
