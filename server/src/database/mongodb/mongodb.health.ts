// libs
import mongoose from "mongoose";
// types
import type {
  ConnectionStateValue,
  ConnectionMetrics,
  DatabaseStats,
  MongoConfig
} from "@/types/mongodb";
// others
import { CONNECTION_STATES } from "@/constants/database";

export const isHealthy = (state: ConnectionStateValue): boolean =>
  state === CONNECTION_STATES.CONNECTED && mongoose.connection.readyState === 1;

export const getStats = (
  state: ConnectionStateValue,
  metrics: ConnectionMetrics,
  config: MongoConfig
): DatabaseStats => {
  const uptime = metrics.lastConnectionTime
    ? Date.now() - metrics.lastConnectionTime.getTime()
    : 0;

  const stateNames: Record<ConnectionStateValue, string> = {
    [CONNECTION_STATES.DISCONNECTED]: "DISCONNECTED",
    [CONNECTION_STATES.CONNECTED]: "CONNECTED",
    [CONNECTION_STATES.CONNECTING]: "CONNECTING",
    [CONNECTION_STATES.DISCONNECTING]: "DISCONNECTING"
  };

  return {
    isHealthy: isHealthy(state),
    state: stateNames[state],
    readyState: mongoose.connection.readyState,
    metrics: {
      ...metrics,
      uptime
    },
    config: {
      database: config.dbName,
      maxPoolSize: config.options?.maxPoolSize,
      minPoolSize: config.options?.minPoolSize
    }
  };
};
