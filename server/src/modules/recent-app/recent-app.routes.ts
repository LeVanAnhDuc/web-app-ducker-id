// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { RecentAppController } from "./recent-app.controller";
// common
import { STATUS_CODES } from "@/common/http";
import { handle } from "@/common/responses";
// validators
import {
  listRecentAppsQuerySchema,
  recentAppIdParamSchema,
  recentAppsStatsQuerySchema
} from "@/validators/schemas/recent-app";
// others
import { authGuard, paramsPipe, queryPipe } from "@/middlewares";

export const createRecentAppUserRoutes = (
  controller: RecentAppController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const recentApps = Router();

  recentApps.use(authGuard);

  recentApps.get(
    "/",
    queryPipe(listRecentAppsQuerySchema),
    handle(controller.list, { message: "recentApp:success.list" })
  );
  // Before "/:appId" so the literal segment is not read as an app id.
  recentApps.get(
    "/stats",
    queryPipe(recentAppsStatsQuerySchema),
    handle(controller.stats, { message: "recentApp:success.stats" })
  );
  recentApps.delete(
    "/",
    handle(controller.clear, { status: STATUS_CODES.NO_CONTENT })
  );
  recentApps.post(
    "/:appId",
    rl.recordRecentAppByUser,
    paramsPipe(recentAppIdParamSchema),
    handle(controller.record, { status: STATUS_CODES.NO_CONTENT })
  );
  recentApps.delete(
    "/:appId",
    paramsPipe(recentAppIdParamSchema),
    handle(controller.hide, { status: STATUS_CODES.NO_CONTENT })
  );
  recentApps.post(
    "/:appId/restore",
    paramsPipe(recentAppIdParamSchema),
    handle(controller.restore, { status: STATUS_CODES.NO_CONTENT })
  );

  router.use("/users/me/recent-apps", recentApps);
  return router;
};
