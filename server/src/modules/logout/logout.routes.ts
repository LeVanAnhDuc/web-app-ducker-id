// libs
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { LogoutController } from "./logout.controller";
// common
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
    handle(controller.logout, { status: StatusCodes.NO_CONTENT })
  );

  router.use("/auth/logout", logout);
  return router;
};
