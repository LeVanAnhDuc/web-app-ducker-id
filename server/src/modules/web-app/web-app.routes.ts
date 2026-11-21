// libs
import { Router } from "express";
// types
import type { WebAppController } from "./web-app.controller";
// common
import { STATUS_CODES } from "@/common/http";
import { handle } from "@/common/responses";
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
  queryPipe,
  bodyPipe,
  paramsPipe
} from "@/middlewares";

export const createAdminWebAppRoutes = (
  controller: WebAppController
): Router => {
  const router = Router();
  const adminApps = Router();

  adminApps.use(authGuard, adminGuard);

  adminApps.get(
    "/",
    queryPipe(adminListAppsQuerySchema),
    handle(controller.listApps, { message: "webApp:success.listApps" })
  );

  adminApps.post(
    "/",
    bodyPipe(adminCreateAppBodySchema),
    handle(controller.createApp, {
      status: STATUS_CODES.CREATED,
      message: "webApp:success.createApp"
    })
  );

  adminApps.patch(
    "/:id",
    paramsPipe(adminAppIdParamSchema),
    bodyPipe(adminUpdateAppBodySchema),
    handle(controller.updateApp, { message: "webApp:success.updateApp" })
  );

  router.use("/admin/apps", adminApps);
  return router;
};

export const createUserWebAppRoutes = (
  controller: WebAppController
): Router => {
  const router = Router();
  const apps = Router();

  apps.get(
    "/",
    authGuard,
    queryPipe(listAppsQuerySchema),
    handle(controller.listUserApps, { message: "webApp:success.listApps" })
  );

  router.use("/apps", apps);
  return router;
};
