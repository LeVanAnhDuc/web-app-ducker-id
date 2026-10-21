// libs
import mongoose from "mongoose";
// others
import config from "@/constants/env";
import { Logger } from "@/libs/logger";

export const connectMongo = async (): Promise<void> => {
  mongoose.connection.on("disconnected", () =>
    Logger.warn("MongoDB disconnected")
  );
  mongoose.connection.on("reconnected", () =>
    Logger.info("MongoDB reconnected")
  );
  mongoose.connection.on("error", (error) =>
    Logger.error("MongoDB error", error)
  );

  await mongoose.connect(config.db.url, {
    dbName: config.db.name,
    maxPoolSize: config.db.pool.max,
    minPoolSize: config.db.pool.min,
    serverSelectionTimeoutMS: config.db.timeout.serverSelectionMs,
    socketTimeoutMS: config.db.timeout.socketMs
  });
};

export const disconnectMongo = () => mongoose.disconnect();

export const isMongoHealthy = () => mongoose.connection.readyState === 1;
