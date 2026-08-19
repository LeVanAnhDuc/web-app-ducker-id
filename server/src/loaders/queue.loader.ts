// types
import type { Express } from "express";
import type { SendEmailService } from "@/services/email/email.service";
import type { QueueService } from "@/services/queue/queue.service";
import type { EmailJobData } from "@/types/services/queue";
// services
import { createQueueModule } from "@/services/queue/queue.module";
// others
import { Logger } from "@/libs/logger";

const BULL_BOARD_PATH = "/admin/queues";

export interface AppQueues {
  emailQueue: QueueService<EmailJobData> | null;
}

let closeQueuesFn: (() => Promise<void>) | null = null;

export const loadQueues = (
  app: Express,
  emailService: SendEmailService
): AppQueues => {
  const { emailQueue, bullBoardAdapter, closeQueues } =
    createQueueModule(emailService);

  closeQueuesFn = closeQueues;

  if (bullBoardAdapter) {
    app.use(BULL_BOARD_PATH, bullBoardAdapter.getRouter());
  }

  Logger.info("Queues loaded successfully");

  return { emailQueue };
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
