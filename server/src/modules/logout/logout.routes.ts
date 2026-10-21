// libs
import { Router } from "express";
// types
import type { LogoutController } from "./logout.controller";
// common
import { STATUS_CODES } from "@/common/http";
import { handle } from "@/common/responses";
// others
import { passwordChangeAuthGuard } from "@/middlewares";

export const createLogoutRoutes = (controller: LogoutController): Router => {
  const router = Router();
  const logout = Router();

  // A temporary-password session may still sign out.
  logout.post(
    "/",
    passwordChangeAuthGuard,
    handle(controller.logout, { status: STATUS_CODES.NO_CONTENT })
  );

  router.use("/auth/logout", logout);
  return router;
};
