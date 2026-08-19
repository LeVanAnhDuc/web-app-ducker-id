// others
import { MongoLoginHistoryRepository } from "./login-history.repository";
import { LoginHistoryService } from "./login-history.service";
import { LoginHistoryController } from "./login-history.controller";
import {
  createLoginHistoryUserRoutes,
  createLoginHistoryAdminRoutes
} from "./login-history.routes";

export const createLoginHistoryModule = () => {
  const loginHistoryRepo = new MongoLoginHistoryRepository();
  const loginHistoryService = new LoginHistoryService(loginHistoryRepo);
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
