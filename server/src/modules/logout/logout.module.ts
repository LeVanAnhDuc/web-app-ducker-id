// types
import type { SessionService } from "@/modules/session/session.service";
import type { TokenService } from "@/modules/token/token.service";
// others
import { LogoutService } from "./logout.service";
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
