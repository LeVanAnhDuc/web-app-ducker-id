// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// modules
import { MongoUserRepository } from "@/modules/user/repository/impl/mongo-user.repository";
import { MongoWebAppRepository } from "@/modules/web-app/repository/impl/mongo-web-app.repository";
// others
import { MongoEntitlementRepository } from "./repository/impl/mongo-entitlement.repository";
import { AccessPolicy } from "./services/access-policy";
import { EntitlementAdminService } from "./services/entitlement-admin";
import { EntitlementController } from "./entitlement.controller";
import { createEntitlementAdminRoutes } from "./entitlement.routes";

/**
 * Wired before every module that decides what a user may open: they take
 * `accessPolicy` from here, so the one rule lives in one place.
 */
export const createEntitlementModule = (
  rateLimiter: RateLimiterMiddleware,
  notificationDispatcher: NotificationDispatcher
) => {
  const entitlementRepo = new MongoEntitlementRepository();
  const service = new EntitlementAdminService({
    entitlementRepo,
    userRepo: new MongoUserRepository(),
    webAppRepo: new MongoWebAppRepository(),
    notificationDispatcher
  });
  const controller = new EntitlementController(service);

  return {
    accessPolicy: new AccessPolicy(entitlementRepo),
    entitlementAdminRouter: createEntitlementAdminRoutes(
      controller,
      rateLimiter
    )
  };
};
