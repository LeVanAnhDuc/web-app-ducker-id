// others
import { MongoNotificationWriter } from "./mongo-notification.writer";
import { NotificationDeliveryService } from "./notification.service";

export const createNotificationDeliveryModule = () => {
  const notificationDelivery = new NotificationDeliveryService(
    new MongoNotificationWriter()
  );

  return { notificationDelivery };
};
