// libs
import { Router } from "express";
// types
import type { NotificationController } from "./notification.controller";
// common
import { handle } from "@/common/responses";
// validators
import {
  notificationListQuerySchema,
  notificationIdParamSchema
} from "@/validators/schemas/notification";
// others
import { authGuard, queryPipe, paramsPipe } from "@/middlewares";

export const createNotificationUserRoutes = (
  controller: NotificationController
): Router => {
  const router = Router();
  const notifications = Router();

  notifications.use(authGuard);

  notifications.get(
    "/unread-count",
    handle(controller.unreadCount, {
      message: "notification:success.unreadCount"
    })
  );
  notifications.patch(
    "/read-all",
    handle(controller.markAllRead, {
      message: "notification:success.markAllRead"
    })
  );
  notifications.get(
    "/",
    queryPipe(notificationListQuerySchema),
    handle(controller.list, { message: "notification:success.list" })
  );
  notifications.patch(
    "/:id/read",
    paramsPipe(notificationIdParamSchema),
    handle(controller.markRead, { message: "notification:success.markRead" })
  );

  router.use("/notifications", notifications);
  return router;
};
