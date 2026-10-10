// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { RecentAppController } from "./recent-app.controller";
// validators
import {
  listRecentAppsQuerySchema,
  recentAppIdParamSchema,
  recentAppsStatsQuerySchema
} from "@/validators/schemas/recent-app";
// others
import { authGuard, paramsPipe, queryPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

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
    asyncHandler(controller.list)
  );
  // Before "/:appId" so the literal segment is not read as an app id.
  recentApps.get(
    "/stats",
    queryPipe(recentAppsStatsQuerySchema),
    asyncHandler(controller.stats)
  );
  recentApps.delete("/", asyncHandler(controller.clear));
  recentApps.post(
    "/:appId",
    rl.recordRecentAppByUser,
    paramsPipe(recentAppIdParamSchema),
    asyncHandler(controller.record)
  );
  recentApps.delete(
    "/:appId",
    paramsPipe(recentAppIdParamSchema),
    asyncHandler(controller.hide)
  );
  recentApps.post(
    "/:appId/restore",
    paramsPipe(recentAppIdParamSchema),
    asyncHandler(controller.restore)
  );

  router.use("/users/me/recent-apps", recentApps);
  return router;
};
