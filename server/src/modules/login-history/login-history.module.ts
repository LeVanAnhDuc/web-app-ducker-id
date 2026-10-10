// types
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// others
import { MongoLoginHistoryRepository } from "./repository/impl/mongo-login-history.repository";
import { LoginHistoryService } from "./services";
import { LoginHistoryController } from "./login-history.controller";
import {
  createLoginHistoryUserRoutes,
  createLoginHistoryAdminRoutes
} from "./login-history.routes";

export const createLoginHistoryModule = (
  notificationDispatcher: NotificationDispatcher
) => {
  const loginHistoryRepo = new MongoLoginHistoryRepository();
  const loginHistoryService = new LoginHistoryService({
    loginHistoryRepo,
    notificationDispatcher
  });
  const loginHistoryController = new LoginHistoryController(
    loginHistoryService
  );

  return {
    loginHistoryService,
    loginHistoryUserRouter: createLoginHistoryUserRoutes(
      loginHistoryController
    ),
    loginHistoryAdminRouter: createLoginHistoryAdminRoutes(
      loginHistoryController
    )
  };
};
