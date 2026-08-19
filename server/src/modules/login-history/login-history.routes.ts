// libs
import { Router } from "express";
// types
import type { LoginHistoryController } from "./login-history.controller";
// validators
import {
  loginHistoryQuerySchema,
  loginHistoryAdminQuerySchema,
  loginHistoryIdParamSchema
} from "@/validators/schemas/login-history";
// others
import { adminGuard, authGuard, paramsPipe, queryPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createLoginHistoryUserRoutes = (
  controller: LoginHistoryController
): Router => {
  const router = Router();
  const loginHistory = Router();

  loginHistory.use(authGuard);

  loginHistory.get("/stats", asyncHandler(controller.getMyStats));

  loginHistory.get(
    "/",
    queryPipe(loginHistoryQuerySchema),
    asyncHandler(controller.getMyHistory)
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
    asyncHandler(controller.getAllHistory)
  );

  adminLoginHistory.get(
    "/:id",
    paramsPipe(loginHistoryIdParamSchema),
    asyncHandler(controller.getHistoryDetail)
  );

  router.use("/admin/login-history", adminLoginHistory);
  return router;
};
