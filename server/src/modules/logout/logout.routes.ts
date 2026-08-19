// libs
import { Router } from "express";
// types
import type { LogoutController } from "./logout.controller";
// others
import { authGuard } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createLogoutRoutes = (controller: LogoutController): Router => {
  const router = Router();
  const logout = Router();

  logout.post("/", authGuard, asyncHandler(controller.logout));

  router.use("/auth/logout", logout);
  return router;
};
