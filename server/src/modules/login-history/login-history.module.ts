// types
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// others
import { MongoLoginHistoryRepository } from "./repository/impl/mongo-login-history.repository";
import { LoginHistoryService } from "./services";
import { LoginHistoryController } from "./login-history.controller";
import { LoginHistoryAdminController } from "./login-history-admin.controller";

export const createLoginHistoryModule = (
  notificationDispatcher: NotificationDispatcher
) => {
  const loginHistoryRepo = new MongoLoginHistoryRepository();
  const loginHistoryService = new LoginHistoryService({
    loginHistoryRepo,
    notificationDispatcher
  });

  return {
    loginHistoryService,
    loginHistoryController: new LoginHistoryController(loginHistoryService),
    loginHistoryAdminController: new LoginHistoryAdminController(
      loginHistoryService
    )
  };
};
