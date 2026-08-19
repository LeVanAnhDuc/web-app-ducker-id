// others
import { MongoNotificationRepository } from "./notification.repository";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { createNotificationUserRoutes } from "./notification.routes";

export const createNotificationModule = () => {
  const repo = new MongoNotificationRepository();
  const service = new NotificationService(repo);
  const controller = new NotificationController(service);

  return {
    notificationService: service,
    notificationUserRouter: createNotificationUserRoutes(controller)
  };
};
