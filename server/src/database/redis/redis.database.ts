// libs
import { ConnectionTimeoutError, createClient } from "redis";
// common
import { RedisError } from "@/common/exceptions";
// others
import { Logger } from "@/libs/logger";
import { buildRedisConfig } from "./redis.config";
import { setupEventHandlers } from "./redis.events";
import { checkRedisHealth, type RedisHealthStatus } from "./redis.health";

class RedisDatabase {
  private static instance: RedisDatabase | null = null;
  private redisClient: ReturnType<typeof createClient> | null = null;

  public static getInstance(): RedisDatabase {
    if (this.instance === null) {
      this.instance = new RedisDatabase();
    }
    return this.instance;
  }

  public connectRedis = async (): Promise<void> => {
    const startTime = Date.now();
    try {
      const redisConfig = buildRedisConfig();

      if (!redisConfig) {
        Logger.warn("Redis configuration not found, skipping connection");
        return;
      }

      this.redisClient = createClient(redisConfig);
      setupEventHandlers(this.redisClient);

      await this.redisClient.connect();
      Logger.info("Redis connected successfully", {
        duration_ms: Date.now() - startTime
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error("Failed to connect Redis", {
        error: error instanceof Error ? error.message : error,
        duration_ms: duration,
        isTimeout: error instanceof ConnectionTimeoutError
      });

      // if (error instanceof ConnectionTimeoutError) {
      // metrics.increment('redis.connection.timeout');
      // }

      throw new RedisError({ message: "Redis connection error" });
    }
  };

  public getClient = (): ReturnType<typeof createClient> => {
    if (!this.redisClient || !this.redisClient.isOpen) {
      throw new RedisError({ message: "Redis client is not connected" });
    }
    return this.redisClient;
  };

  public closeRedis = async (): Promise<void> => {
    try {
      if (this.redisClient) {
        await this.redisClient.disconnect();
        this.redisClient = null;
        Logger.info("Redis connection closed successfully");
      }
    } catch (error) {
      Logger.error("Error closing Redis connection", error);
      throw new RedisError({ message: "Redis connection error" });
    }
  };

  /**
   * Health check for Redis connection
   */
  public healthCheck = async (): Promise<RedisHealthStatus> =>
    checkRedisHealth(this.redisClient);
}

const instanceRedis = RedisDatabase.getInstance();

export default instanceRedis;
