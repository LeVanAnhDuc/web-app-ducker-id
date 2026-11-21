// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { EntitlementController } from "./entitlement.controller";
// common
import { handle } from "@/common/responses";
// validators
import {
  entitlementMatrixQuerySchema,
  updateEntitlementsBodySchema
} from "@/validators/schemas/entitlement";
// others
import { adminGuard, authGuard, bodyPipe, queryPipe } from "@/middlewares";

export const createEntitlementAdminRoutes = (
  controller: EntitlementController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const entitlements = Router();

  entitlements.use(authGuard, adminGuard);

  entitlements.get(
    "/",
    queryPipe(entitlementMatrixQuerySchema),
    handle(controller.getMatrix, { message: "entitlement:success.get" })
  );
  entitlements.patch(
    "/",
    rl.entitlementMutationByIpAndUser,
    bodyPipe(updateEntitlementsBodySchema),
    handle(controller.updateMatrix, { message: "entitlement:success.update" })
  );

  router.use("/admin/entitlements", entitlements);
  return router;
};
