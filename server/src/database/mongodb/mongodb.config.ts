// types
import type { ConnectOptions } from "mongoose";
import type { MongoConfig } from "@/types/mongodb";
// others
import config from "@/constants/env";

export const MAX_RECONNECT_ATTEMPTS = 10;

export const buildMongoConfig = (): MongoConfig => {
  if (!config.DB_URL?.trim()) {
    throw new Error("MongoDB connection URL is required");
  }

  if (!config.DB_NAME?.trim()) {
    throw new Error("MongoDB database name is required");
  }

  const options: ConnectOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    compressors: config.NODE_ENV === "development" ? [] : ["zlib"],
    retryWrites: true,
    w: "majority",
    autoCreate: true,
    autoIndex: true,
    replicaSet: "rs0"
  };

  return {
    url: config.DB_URL,
    dbName: config.DB_NAME,
    options
  };
};
