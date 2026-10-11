// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { EntitlementController } from "./entitlement.controller";
// validators
import {
  entitlementMatrixQuerySchema,
  updateEntitlementsBodySchema
} from "@/validators/schemas/entitlement";
// others
import { adminGuard, authGuard, bodyPipe, queryPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

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
    asyncHandler(controller.getMatrix)
  );
  entitlements.patch(
    "/",
    rl.entitlementMutationByIpAndUser,
    bodyPipe(updateEntitlementsBodySchema),
    asyncHandler(controller.updateMatrix)
  );

  router.use("/admin/entitlements", entitlements);
  return router;
};
