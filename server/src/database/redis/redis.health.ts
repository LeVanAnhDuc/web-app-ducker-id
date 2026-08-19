// types
import type { createClient } from "redis";
// others
import { Logger } from "@/libs/logger";

export interface RedisHealthStatus {
  isConnected: boolean;
  isHealthy: boolean;
  latency?: number;
  error?: string;
}

export const checkRedisHealth = async (
  client: ReturnType<typeof createClient> | null
): Promise<RedisHealthStatus> => {
  if (!client || !client.isOpen) {
    return {
      isConnected: false,
      isHealthy: false,
      error: "Redis client is not connected"
    };
  }

  try {
    const startTime = Date.now();
    await client.ping();
    const latency = Date.now() - startTime;

    Logger.debug("Redis health check passed", { latency_ms: latency });

    return {
      isConnected: true,
      isHealthy: true,
      latency
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    Logger.error("Redis health check failed", { error: errorMessage });

    return {
      isConnected: true,
      isHealthy: false,
      error: errorMessage
    };
  }
};
