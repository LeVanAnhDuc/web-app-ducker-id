// libs
import { Router } from "express";
// types
import type { LogoutController } from "./logout.controller";
// others
import { passwordChangeAuthGuard } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createLogoutRoutes = (controller: LogoutController): Router => {
  const router = Router();
  const logout = Router();

  // A temporary-password session may still sign out.
  logout.post("/", passwordChangeAuthGuard, asyncHandler(controller.logout));

  router.use("/auth/logout", logout);
  return router;
};
