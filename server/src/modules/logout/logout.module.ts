// types
import type { SessionService } from "@/modules/session/services";
import type { TokenService } from "@/modules/token/services";
// others
import { LogoutService } from "./services";
import { LogoutController } from "./logout.controller";
import { createLogoutRoutes } from "./logout.routes";

export const createLogoutModule = (
  sessionService: SessionService,
  tokenService: TokenService
) => {
  const logoutService = new LogoutService(sessionService, tokenService);
  const logoutController = new LogoutController(logoutService);

  return {
    logoutRouter: createLogoutRoutes(logoutController),
    logoutService
  };
};
