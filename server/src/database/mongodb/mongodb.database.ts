// libs
import mongoose from "mongoose";
// types
import type {
  ConnectionStateValue,
  MongoConfig,
  ConnectionMetrics
} from "@/types/mongodb";
// others
import { Logger } from "@/libs/logger";
import { CONNECTION_STATES } from "@/constants/database";
import { buildMongoConfig, MAX_RECONNECT_ATTEMPTS } from "./mongodb.config";
import { setupEventHandlers, updateConnectionState } from "./mongodb.events";
import { isHealthy, getStats } from "./mongodb.health";

class MongoDatabase {
  private static instance: MongoDatabase | null = null;
  private connectionState: ConnectionStateValue =
    CONNECTION_STATES.DISCONNECTED;
  private connectionPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private config: MongoConfig | null = null;
  private isEventListenersSetup = false;
  private metrics: ConnectionMetrics = {
    connectionAttempts: 0,
    reconnectionAttempts: 0,
    lastConnectionTime: null,
    lastDisconnectionTime: null,
    totalDowntime: 0
  };

  private constructor() {}

  public static getInstance(): MongoDatabase {
    if (!this.instance) {
      this.instance = new MongoDatabase();
    }
    return this.instance;
  }

  private setupEventListeners(): void {
    if (this.isEventListenersSetup) {
      return;
    }

    setupEventHandlers(mongoose.connection, {
      onConnected: () => this.handleConnected(),
      onDisconnected: () => this.handleDisconnected(),
      onError: () => this.handleError(),
      onReconnected: () => this.handleReconnected()
    });

    this.isEventListenersSetup = true;
  }

  public async connect(): Promise<void> {
    if (!this.config) {
      this.config = buildMongoConfig();
    }

    this.setupEventListeners();

    if (this.connectionState === CONNECTION_STATES.CONNECTED) {
      Logger.debug("MongoDB is already connected");
      return;
    }

    if (this.connectionPromise) {
      Logger.debug("MongoDB connection already in progress");
      return this.connectionPromise;
    }

    this.connectionState = updateConnectionState(
      this.connectionState,
      CONNECTION_STATES.CONNECTING
    );
    this.connectionPromise = this.performConnection();

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async performConnection(): Promise<void> {
    this.metrics.connectionAttempts++;

    try {
      Logger.info("Attempting to connect to MongoDB", {
        dbName: this.config.dbName,
        attempt: this.metrics.connectionAttempts,
        currentReadyState: mongoose.connection.readyState
      });

      if (mongoose.connection.readyState === 1) {
        Logger.debug("MongoDB already connected, skipping connection attempt");
        this.handleConnectionSuccess();
        return;
      }

      if (mongoose.connection.readyState === 2) {
        Logger.debug("MongoDB connection already in progress");
        return;
      }

      await mongoose.connect(this.config.url, {
        dbName: this.config.dbName,
        ...this.config.options
      });

      this.handleConnectionSuccess();
    } catch (error) {
      await this.handleConnectionError(error);
    }
  }

  private handleConnectionSuccess(): void {
    this.connectionState = updateConnectionState(
      this.connectionState,
      CONNECTION_STATES.CONNECTED
    );
    this.metrics.lastConnectionTime = new Date();
    this.reconnectAttempts = 0;

    if (this.metrics.lastDisconnectionTime) {
      const downtime =
        Date.now() - this.metrics.lastDisconnectionTime.getTime();
      this.metrics.totalDowntime += downtime;
      Logger.info(`MongoDB recovered after ${downtime}ms downtime`);
    }

    Logger.info("MongoDB connected successfully", {
      dbName: this.config.dbName,
      host: mongoose.connection.host,
      readyState: mongoose.connection.readyState
    });
  }

  private async handleConnectionError(error: unknown): Promise<void> {
    this.connectionState = updateConnectionState(
      this.connectionState,
      CONNECTION_STATES.DISCONNECTED
    );

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    Logger.error("MongoDB connection failed", error);

    if (this.metrics.connectionAttempts === 1) {
      throw new Error(`Initial MongoDB connection failed: ${errorMessage}`);
    }

    await this.scheduleReconnection();
  }

  private handleConnected(): void {
    this.connectionState = updateConnectionState(
      this.connectionState,
      CONNECTION_STATES.CONNECTED
    );
    this.metrics.lastConnectionTime = new Date();
  }

  private handleDisconnected(): void {
    if (this.connectionState === CONNECTION_STATES.DISCONNECTING) {
      Logger.info("MongoDB disconnected gracefully");
      return;
    }

    this.connectionState = updateConnectionState(
      this.connectionState,
      CONNECTION_STATES.DISCONNECTED
    );
    this.metrics.lastDisconnectionTime = new Date();

    Logger.warn("MongoDB disconnected, waiting for automatic reconnection");
  }

  private handleError(): void {
    Logger.error("MongoDB error, waiting for automatic reconnection");
  }

  private handleReconnected(): void {
    this.connectionState = updateConnectionState(
      this.connectionState,
      CONNECTION_STATES.CONNECTED
    );
    this.metrics.lastConnectionTime = new Date();
    this.metrics.reconnectionAttempts++;
    this.reconnectAttempts = 0;

    Logger.info("MongoDB reconnected successfully", {
      totalReconnections: this.metrics.reconnectionAttempts
    });
  }

  private async scheduleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      const error = new Error("Maximum reconnection attempts exceeded");
      Logger.error(error.message, { attempts: this.reconnectAttempts });
      process.nextTick(() => process.exit(1));
      return;
    }

    this.reconnectAttempts++;

    Logger.info(
      `Reconnecting immediately, attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`
    );

    try {
      await this.connect();
    } catch (error) {
      Logger.error("Reconnection attempt failed", error);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connectionState === CONNECTION_STATES.DISCONNECTED) {
      Logger.debug("MongoDB is already disconnected");
      return;
    }

    this.connectionState = updateConnectionState(
      this.connectionState,
      CONNECTION_STATES.DISCONNECTING
    );

    try {
      await mongoose.connection.close();
      this.connectionState = updateConnectionState(
        this.connectionState,
        CONNECTION_STATES.DISCONNECTED
      );
      Logger.info("MongoDB disconnected gracefully");
    } catch (error) {
      Logger.error("Error during MongoDB disconnection", error);
      throw error;
    }
  }

  public isHealthy(): boolean {
    return isHealthy(this.connectionState);
  }

  public getStats() {
    if (!this.config) {
      this.config = buildMongoConfig();
    }
    return getStats(this.connectionState, this.metrics, this.config);
  }

  public static async resetInstance(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
    }
  }
}

const instanceMongoDB = MongoDatabase.getInstance();

export default instanceMongoDB;
