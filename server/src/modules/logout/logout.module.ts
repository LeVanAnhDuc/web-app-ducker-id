// types
import type { SessionService } from "@/modules/session/service";
// others
import { LogoutService } from "./service";
import { LogoutController } from "./logout.controller";
import { createLogoutRoutes } from "./logout.routes";

export const createLogoutModule = (sessionService: SessionService) => {
  const logoutService = new LogoutService(sessionService);
  const logoutController = new LogoutController(logoutService);

  return {
    logoutRouter: createLogoutRoutes(logoutController),
    logoutService
  };
};
