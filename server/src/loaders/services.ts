// types
import type { Router } from "express";
// services
import { createEmailModule } from "@/services/email/email.module";
import { EmailDispatcher } from "@/services/email/email.dispatcher";
import { createNotificationDeliveryModule } from "@/services/notification/notification.module";
import { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import { createQueueModule } from "@/services/queue/queue.module";

export interface AppServices {
  emailDispatcher: EmailDispatcher;
  notificationDispatcher: NotificationDispatcher;
  bullBoardRouter: Router;
  close: () => Promise<void>;
}

/**
 * Builds the cross-module services and the queues behind them. Queues come
 * before modules because every module that sends mail or notifications takes
 * a dispatcher, and a dispatcher needs its queue.
 */
export const createServices = (): AppServices => {
  const { emailService } = createEmailModule();
  const { notificationDelivery } = createNotificationDeliveryModule();
  const { emailQueue, notificationQueue, bullBoardAdapter, closeQueues } =
    createQueueModule(emailService, notificationDelivery);

  return {
    emailDispatcher: new EmailDispatcher(emailService, emailQueue),
    notificationDispatcher: new NotificationDispatcher(
      notificationDelivery,
      notificationQueue
    ),
    bullBoardRouter: bullBoardAdapter.getRouter(),
    close: closeQueues
  };
};
