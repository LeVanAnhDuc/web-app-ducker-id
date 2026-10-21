// types
import type { ConnectionOptions } from "bullmq";
// others
import config from "@/constants/env";

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
  if (!config.redis.url) return null;

  return parseRedisUrl(config.redis.url);
};
