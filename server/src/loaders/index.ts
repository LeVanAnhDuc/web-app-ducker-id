// types
import type { Express } from "express";
// services
import { EmailDispatcher } from "@/services/email/email.dispatcher";
import { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// others
import { loadDatabase, closeDatabase } from "./database.loader";
import { loadRedis, closeRedis } from "./redis.loader";
import { loadServices } from "./services.loader";
import { loadQueues, closeAllQueues } from "./queue.loader";
import { loadSigningKeys } from "./jwks.loader";
import { loadModules } from "./modules.loader";
import { loadHealthCheck } from "./health.loader";
import { loadErrorHandlers } from "./error-handler.loader";
import { Logger } from "@/libs/logger";

export const loadAll = async (app: Express): Promise<void> => {
  try {
    await loadDatabase();
    await loadRedis();

    const { emailService, notificationDelivery } = loadServices();
    const { emailQueue, notificationQueue } = loadQueues(
      app,
      emailService,
      notificationDelivery
    );
    const emailDispatcher = new EmailDispatcher(emailService, emailQueue);
    const notificationDispatcher = new NotificationDispatcher(
      notificationDelivery,
      notificationQueue
    );
    loadSigningKeys();
    loadModules(app, emailDispatcher, notificationDispatcher);
    loadHealthCheck(app);
    loadErrorHandlers(app);

    Logger.info("All loaders initialized successfully");
  } catch (error) {
    Logger.error("Failed to initialize loaders", error);
    throw error;
  }
};

export const closeAll = async (): Promise<void> => {
  try {
    await closeAllQueues();
    await closeDatabase();
    await closeRedis();
    Logger.info("All connections closed successfully");
  } catch (error) {
    Logger.error("Failed to close all connections", error);
    throw error;
  }
};
