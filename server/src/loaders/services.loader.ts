// types
import type { SendEmailService } from "@/services/email/email.service";
import type { NotificationDeliveryService } from "@/services/notification/notification.service";
// services
import { createEmailModule } from "@/services/email/email.module";
import { createNotificationDeliveryModule } from "@/services/notification/notification.module";
// others
import { Logger } from "@/libs/logger";

export interface AppServices {
  emailService: SendEmailService;
  notificationDelivery: NotificationDeliveryService;
}

export const loadServices = (): AppServices => {
  const { emailService } = createEmailModule();
  const { notificationDelivery } = createNotificationDeliveryModule();

  Logger.info("Services loaded successfully");

  return { emailService, notificationDelivery };
};
