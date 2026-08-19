// database
import instanceMongoDB from "@/database/mongodb";
// others
import { Logger } from "@/libs/logger";

export const loadDatabase = async (): Promise<void> => {
  try {
    await instanceMongoDB.connect();
    Logger.info("MongoDB initialized successfully");
  } catch (error) {
    Logger.error("Failed to initialize MongoDB", error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await instanceMongoDB.disconnect();
    Logger.info("MongoDB connections closed");
  } catch (error) {
    Logger.error("Failed to close MongoDB connections", error);
    throw error;
  }
};
