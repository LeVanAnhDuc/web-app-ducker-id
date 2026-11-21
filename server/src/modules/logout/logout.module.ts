// types
import type { SessionService } from "@/modules/session/services";
import type { TokenService } from "@/modules/token/services";
// others
import { LogoutService } from "./services";
import { LogoutController } from "./logout.controller";

export const createLogoutModule = (
  sessionService: SessionService,
  tokenService: TokenService
) => {
  const logoutService = new LogoutService(sessionService, tokenService);
  return {
    logoutController: new LogoutController(logoutService),
    logoutService
  };
};
