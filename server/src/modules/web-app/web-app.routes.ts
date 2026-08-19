// libs
import { Router } from "express";
// types
import type { WebAppController } from "./web-app.controller";
// validators
import {
  adminListAppsQuerySchema,
  adminCreateAppBodySchema,
  adminUpdateAppBodySchema,
  adminAppIdParamSchema,
  listAppsQuerySchema
} from "@/validators/schemas/web-app";
// others
import {
  adminGuard,
  authGuard,
  optionalAuthGuard,
  queryPipe,
  bodyPipe,
  paramsPipe
} from "@/middlewares";
import type { RateLimiterMiddleware } from "@/middlewares/common/rate-limiter.middleware";
import { asyncHandler } from "@/utils/async-handler";

export const createAdminWebAppRoutes = (
  controller: WebAppController
): Router => {
  const router = Router();
  const adminApps = Router();

  adminApps.use(authGuard, adminGuard);

  adminApps.get("/categories", asyncHandler(controller.listCategories));

  adminApps.get(
    "/",
    queryPipe(adminListAppsQuerySchema),
    asyncHandler(controller.listApps)
  );

  adminApps.post(
    "/",
    bodyPipe(adminCreateAppBodySchema),
    asyncHandler(controller.createApp)
  );

  adminApps.patch(
    "/:id",
    paramsPipe(adminAppIdParamSchema),
    bodyPipe(adminUpdateAppBodySchema),
    asyncHandler(controller.updateApp)
  );

  router.use("/admin/apps", adminApps);
  return router;
};

export const createUserWebAppRoutes = (
  controller: WebAppController,
  rateLimiter: RateLimiterMiddleware
): Router => {
  const router = Router();
  const apps = Router();

  apps.get(
    "/categories",
    rateLimiter.categoriesByIp,
    optionalAuthGuard,
    asyncHandler(controller.listUserCategories)
  );

  apps.get(
    "/",
    authGuard,
    queryPipe(listAppsQuerySchema),
    asyncHandler(controller.listUserApps)
  );

  router.use("/apps", apps);
  return router;
};
