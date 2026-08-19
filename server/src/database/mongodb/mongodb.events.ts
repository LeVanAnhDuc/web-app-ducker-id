// types
import type { Connection } from "mongoose";
import type { ConnectionStateValue } from "@/types/mongodb";
// others
import { Logger } from "@/libs/logger";
import { CONNECTION_STATES } from "@/constants/database";

interface EventHandlers {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: () => void;
  onReconnected: () => void;
}

export const setupEventHandlers = (
  connection: Connection,
  handlers: EventHandlers
): void => {
  connection.removeAllListeners();

  connection.on("connected", () => {
    Logger.info("MongoDB connection established");
    handlers.onConnected();
  });

  connection.on("disconnected", () => {
    Logger.warn("MongoDB connection lost unexpectedly");
    handlers.onDisconnected();
  });

  connection.on("error", (error: Error) => {
    Logger.error("MongoDB error occurred", error);
    handlers.onError();
  });

  connection.on("reconnected", () => {
    Logger.info("MongoDB reconnected successfully");
    handlers.onReconnected();
  });

  connection.on("serverHeartbeatSucceeded", () => {
    Logger.debug("MongoDB heartbeat succeeded");
  });

  connection.on("serverHeartbeatFailed", () => {
    Logger.warn("MongoDB heartbeat failed");
  });
};

export const updateConnectionState = (
  currentState: ConnectionStateValue,
  newState: ConnectionStateValue
): ConnectionStateValue => {
  if (currentState !== newState) {
    const stateNames: Record<ConnectionStateValue, string> = {
      [CONNECTION_STATES.DISCONNECTED]: "DISCONNECTED",
      [CONNECTION_STATES.CONNECTED]: "CONNECTED",
      [CONNECTION_STATES.CONNECTING]: "CONNECTING",
      [CONNECTION_STATES.DISCONNECTING]: "DISCONNECTING"
    };
    Logger.debug(
      `MongoDB state changed: ${stateNames[currentState]} → ${stateNames[newState]}`
    );
  }
  return newState;
};
