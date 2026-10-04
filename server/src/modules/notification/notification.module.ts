// others
import { MongoNotificationRepository } from "./repository/impl/mongo-notification.repository";
import { NotificationService } from "./service";
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
