// types
import type { Express } from "express";
import type { SendEmailService } from "@/services/email/email.service";
import type { NotificationDeliveryService } from "@/services/notification/notification.service";
import type { QueueService } from "@/services/queue/queue.service";
import type { EmailJobData } from "@/types/services/queue";
import type { NotificationJobData } from "@/types/services/notification";
// services
import { createQueueModule } from "@/services/queue/queue.module";
// middlewares
import { adminGuard } from "@/middlewares";
// others
import { Logger } from "@/libs/logger";

const BULL_BOARD_PATH = "/admin/queues";

export interface AppQueues {
  emailQueue: QueueService<EmailJobData> | null;
  notificationQueue: QueueService<NotificationJobData> | null;
}

let closeQueuesFn: (() => Promise<void>) | null = null;

export const loadQueues = (
  app: Express,
  emailService: SendEmailService,
  notificationDelivery: NotificationDeliveryService
): AppQueues => {
  const { emailQueue, notificationQueue, bullBoardAdapter, closeQueues } =
    createQueueModule(emailService, notificationDelivery);

  closeQueuesFn = closeQueues;

  if (bullBoardAdapter) {
    // Admin only (REQ-AUTHZ-02): job payloads carry one-time codes and
    // temporary passwords in plaintext (BUG-AUTHZ-01). A failed guard reaches
    // the global error filter, which loadErrorHandlers mounts after this.
    app.use(BULL_BOARD_PATH, adminGuard, bullBoardAdapter.getRouter());
  }

  Logger.info("Queues loaded successfully");

  return { emailQueue, notificationQueue };
};

export const closeAllQueues = async (): Promise<void> => {
  try {
    if (closeQueuesFn) {
      await closeQueuesFn();
      Logger.info("Queue connections closed");
    }
  } catch (error) {
    Logger.error("Failed to close queue connections", error);
    throw error;
  }
};
