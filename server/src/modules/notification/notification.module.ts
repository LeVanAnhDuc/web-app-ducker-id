// others
import { MongoNotificationRepository } from "./repository/impl/mongo-notification.repository";
import { NotificationService } from "./services";
import { NotificationController } from "./notification.controller";

export const createNotificationModule = () => {
  const repo = new MongoNotificationRepository();
  const service = new NotificationService(repo);
  const notificationController = new NotificationController(service);

  return {
    notificationService: service,
    notificationController
  };
};
