// types
import type { ConnectOptions } from "mongoose";
import type { CONNECTION_STATES } from "@/constants/database";

export type ConnectionStateValue =
  (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES];

export interface MongoConfig {
  url: string;
  dbName: string;
  options?: ConnectOptions;
}

export interface ConnectionMetrics {
  connectionAttempts: number;
  reconnectionAttempts: number;
  lastConnectionTime: Date | null;
  lastDisconnectionTime: Date | null;
  totalDowntime: number;
  uptime?: number;
}

export interface DatabaseStats {
  isHealthy: boolean;
  state: string;
  readyState: number;
  metrics: ConnectionMetrics;
  config: {
    database: string | undefined;
    maxPoolSize: number | undefined;
    minPoolSize: number | undefined;
  };
}
