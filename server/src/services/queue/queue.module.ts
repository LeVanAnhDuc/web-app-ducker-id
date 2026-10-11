// libs
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
// types
import type { SendEmailService } from "@/services/email/email.service";
import type { NotificationDeliveryService } from "@/services/notification/notification.service";
import type { EmailJobData } from "@/types/services/queue";
import type { NotificationJobData } from "@/types/services/notification";
// others
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { QueueService } from "./queue.service";
import { buildQueueConnection } from "./queue.config";
import { createEmailProcessor } from "./processors/email.processor";
import { createNotificationProcessor } from "./processors/notification.processor";

const QUEUE_NAMES = {
  EMAIL: "email",
  NOTIFICATION: "notification"
} as const;

const BULL_BOARD_PATH = "/admin/queues";

interface QueueModuleResult {
  emailQueue: QueueService<EmailJobData> | null;
  notificationQueue: QueueService<NotificationJobData> | null;
  bullBoardAdapter: ExpressAdapter | null;
  closeQueues: () => Promise<void>;
}

export const createQueueModule = (
  emailService: SendEmailService,
  notificationDelivery: NotificationDeliveryService
): QueueModuleResult => {
  const connection = buildQueueConnection();

  if (!connection) {
    Logger.warn(
      "Queue system disabled: Redis configuration not found. Using direct execution fallback."
    );
    return {
      emailQueue: null,
      notificationQueue: null,
      bullBoardAdapter: null,
      closeQueues: async () => {}
    };
  }

  const emailQueue = new QueueService<EmailJobData>({
    name: QUEUE_NAMES.EMAIL,
    connection,
    processor: createEmailProcessor(emailService),
    onFallback: (data) => {
      withRetry(() => emailService.executeSend(data.type, data), {
        maxAttempts: 3,
        initialDelayMs: 2000,
        operationName: `email-fallback:${data.type}`,
        context: { email: data.email }
      });
    }
  });

  const notificationQueue = new QueueService<NotificationJobData>({
    name: QUEUE_NAMES.NOTIFICATION,
    connection,
    processor: createNotificationProcessor(notificationDelivery),
    onFallback: (data) => {
      withRetry(() => notificationDelivery.deliver(data), {
        maxAttempts: 3,
        initialDelayMs: 2000,
        operationName: `notification-fallback:${data.type}`,
        context: { kind: data.kind, type: data.type }
      });
    }
  });

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BULL_BOARD_PATH);

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue.getQueue()),
      new BullMQAdapter(notificationQueue.getQueue())
    ],
    serverAdapter
  });

  Logger.info("Queue module initialized", {
    queues: [QUEUE_NAMES.EMAIL, QUEUE_NAMES.NOTIFICATION],
    dashboard: BULL_BOARD_PATH
  });

  const closeQueues = async (): Promise<void> => {
    await Promise.all([emailQueue.close(), notificationQueue.close()]);
    Logger.info("All queues closed");
  };

  return {
    emailQueue,
    notificationQueue,
    bullBoardAdapter: serverAdapter,
    closeQueues
  };
};
