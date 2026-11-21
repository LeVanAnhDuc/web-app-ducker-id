// libs
import { Router } from "express";
// types
import type { LoginHistoryController } from "./login-history.controller";
// common
import { handle } from "@/common/responses";
// others
import {
  LoginHistoryAdminQueryDto,
  LoginHistoryIdParamsDto,
  LoginHistoryQueryDto,
  LoginHistoryStatsQueryDto
} from "./dtos/requests";
import { adminGuard, authGuard, paramsPipe, queryPipe } from "@/middlewares";

export const createLoginHistoryUserRoutes = (
  controller: LoginHistoryController
): Router => {
  const router = Router();
  const loginHistory = Router();

  loginHistory.use(authGuard);

  loginHistory.get(
    "/stats",
    queryPipe(LoginHistoryStatsQueryDto),
    handle(controller.getMyStats, {
      message: "loginHistory:success.getMyStats"
    })
  );

  loginHistory.get(
    "/",
    queryPipe(LoginHistoryQueryDto),
    handle(controller.getMyHistory, {
      message: "loginHistory:success.getMyHistory"
    })
  );

  router.use("/login-history", loginHistory);
  return router;
};

export const createLoginHistoryAdminRoutes = (
  controller: LoginHistoryController
): Router => {
  const router = Router();
  const adminLoginHistory = Router();

  adminLoginHistory.use(authGuard, adminGuard);

  adminLoginHistory.get(
    "/",
    queryPipe(LoginHistoryAdminQueryDto),
    handle(controller.getAllHistory, {
      message: "loginHistory:success.getAllHistory"
    })
  );

  adminLoginHistory.get(
    "/:id",
    paramsPipe(LoginHistoryIdParamsDto),
    handle(controller.getHistoryDetail, {
      message: "loginHistory:success.getHistoryDetail"
    })
  );

  router.use("/admin/login-history", adminLoginHistory);
  return router;
};
