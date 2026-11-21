// libs
import { Router } from "express";
// types
import type { RateLimiters } from "@/middlewares";
import type { EntitlementController } from "./entitlement.controller";
// common
import { handle } from "@/common/responses";
// modules
import {
  EntitlementMatrixQueryDto,
  UpdateEntitlementsBodyDto
} from "@/modules/entitlement/dtos/requests";
// others
import { adminGuard, authGuard, bodyPipe, queryPipe } from "@/middlewares";

export const createEntitlementAdminRoutes = (
  controller: EntitlementController,
  rl: RateLimiters
): Router => {
  const router = Router();
  const entitlements = Router();

  entitlements.use(authGuard, adminGuard);

  entitlements.get(
    "/",
    queryPipe(EntitlementMatrixQueryDto),
    handle(controller.getMatrix, { message: "entitlement:success.get" })
  );
  entitlements.patch(
    "/",
    rl.entitlementMutationByIpAndUser,
    bodyPipe(UpdateEntitlementsBodyDto),
    handle(controller.updateMatrix, { message: "entitlement:success.update" })
  );

  router.use("/admin/entitlements", entitlements);
  return router;
};
