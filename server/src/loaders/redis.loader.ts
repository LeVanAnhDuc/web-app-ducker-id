// database
import instanceRedis from "@/database/redis";
// others
import { Logger } from "@/libs/logger";

export const loadRedis = async (): Promise<void> => {
  try {
    await instanceRedis.connectRedis();
    Logger.info("Redis initialized successfully");
  } catch (error) {
    Logger.error("Failed to initialize Redis", error);
    throw error;
  }
};

export const closeRedis = async (): Promise<void> => {
  try {
    await instanceRedis.closeRedis();
    Logger.info("Redis connection closed");
  } catch (error) {
    Logger.error("Failed to close Redis connection", error);
    throw error;
  }
};
