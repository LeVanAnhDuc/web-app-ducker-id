// libs
import { Router } from "express";
// types
import type { NotificationController } from "./notification.controller";
// validators
import {
  notificationListQuerySchema,
  notificationIdParamSchema
} from "@/validators/schemas/notification";
// others
import { authGuard, queryPipe, paramsPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createNotificationUserRoutes = (
  controller: NotificationController
): Router => {
  const router = Router();
  const notifications = Router();

  notifications.use(authGuard);

  notifications.get("/unread-count", asyncHandler(controller.unreadCount));
  notifications.patch("/read-all", asyncHandler(controller.markAllRead));
  notifications.get(
    "/",
    queryPipe(notificationListQuerySchema),
    asyncHandler(controller.list)
  );
  notifications.patch(
    "/:id/read",
    paramsPipe(notificationIdParamSchema),
    asyncHandler(controller.markRead)
  );

  router.use("/notifications", notifications);
  return router;
};
