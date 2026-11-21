// libs
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { WebAppController } from "./web-app.controller";
// common
import { handle } from "@/common/responses";
// modules
import {
  AdminAppsQueryDto,
  AppIdParamsDto,
  CreateAppBodyDto,
  UpdateAppBodyDto,
  UserAppsQueryDto
} from "@/modules/web-app/dtos/requests";
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
    queryPipe(AdminAppsQueryDto),
    handle(controller.listApps, { message: "webApp:success.listApps" })
  );

  adminApps.post(
    "/",
    bodyPipe(CreateAppBodyDto),
    handle(controller.createApp, {
      status: StatusCodes.CREATED,
      message: "webApp:success.createApp"
    })
  );

  adminApps.patch(
    "/:id",
    paramsPipe(AppIdParamsDto),
    bodyPipe(UpdateAppBodyDto),
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
    queryPipe(UserAppsQueryDto),
    handle(controller.listUserApps, { message: "webApp:success.listApps" })
  );

  router.use("/apps", apps);
  return router;
};
