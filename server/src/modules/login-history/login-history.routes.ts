// libs
import { Router } from "express";
// types
import type { LoginHistoryController } from "./login-history.controller";
// common
import { handle } from "@/common/responses";
// validators
import {
  loginHistoryQuerySchema,
  loginHistoryAdminQuerySchema,
  loginHistoryIdParamSchema,
  loginHistoryStatsQuerySchema
} from "@/validators/schemas/login-history";
// others
import { adminGuard, authGuard, paramsPipe, queryPipe } from "@/middlewares";

export const createLoginHistoryUserRoutes = (
  controller: LoginHistoryController
): Router => {
  const router = Router();
  const loginHistory = Router();

  loginHistory.use(authGuard);

  loginHistory.get(
    "/stats",
    queryPipe(loginHistoryStatsQuerySchema),
    handle(controller.getMyStats, {
      message: "loginHistory:success.getMyStats"
    })
  );

  loginHistory.get(
    "/",
    queryPipe(loginHistoryQuerySchema),
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
    queryPipe(loginHistoryAdminQuerySchema),
    handle(controller.getAllHistory, {
      message: "loginHistory:success.getAllHistory"
    })
  );

  adminLoginHistory.get(
    "/:id",
    paramsPipe(loginHistoryIdParamSchema),
    handle(controller.getHistoryDetail, {
      message: "loginHistory:success.getHistoryDetail"
    })
  );

  router.use("/admin/login-history", adminLoginHistory);
  return router;
};
