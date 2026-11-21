// libs
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { RecentAppController } from "./recent-app.controller";
// common
import { handle } from "@/common/responses";
// others
import {
  ListRecentAppsQueryDto,
  RecentAppIdParamsDto,
  RecentAppsStatsQueryDto
} from "./dtos/requests";
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
    queryPipe(ListRecentAppsQueryDto),
    handle(controller.list, { message: "recentApp:success.list" })
  );
  // Before "/:appId" so the literal segment is not read as an app id.
  recentApps.get(
    "/stats",
    queryPipe(RecentAppsStatsQueryDto),
    handle(controller.stats, { message: "recentApp:success.stats" })
  );
  recentApps.delete(
    "/",
    handle(controller.clear, { status: StatusCodes.NO_CONTENT })
  );
  recentApps.post(
    "/:appId",
    rl.recordRecentAppByUser,
    paramsPipe(RecentAppIdParamsDto),
    handle(controller.record, { status: StatusCodes.NO_CONTENT })
  );
  recentApps.delete(
    "/:appId",
    paramsPipe(RecentAppIdParamsDto),
    handle(controller.hide, { status: StatusCodes.NO_CONTENT })
  );
  recentApps.post(
    "/:appId/restore",
    paramsPipe(RecentAppIdParamsDto),
    handle(controller.restore, { status: StatusCodes.NO_CONTENT })
  );

  router.use("/users/me/recent-apps", recentApps);
  return router;
};
