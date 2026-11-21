// types
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// modules
import { MongoUserRepository } from "@/modules/user/repository/impl/mongo-user.repository";
import { MongoWebAppRepository } from "@/modules/web-app/repository/impl/mongo-web-app.repository";
// others
import { MongoEntitlementRepository } from "./repository/impl/mongo-entitlement.repository";
import { AccessPolicy } from "./services/access-policy";
import { EntitlementAdminService } from "./services/entitlement-admin";
import { EntitlementAdminController } from "./entitlement-admin.controller";

/**
 * Wired before every module that decides what a user may open: they take
 * `accessPolicy` from here, so the one rule lives in one place.
 */
export const createEntitlementModule = (
  notificationDispatcher: NotificationDispatcher
) => {
  const entitlementRepo = new MongoEntitlementRepository();
  const service = new EntitlementAdminService(
    entitlementRepo,
    new MongoUserRepository(),
    new MongoWebAppRepository(),
    notificationDispatcher
  );

  return {
    accessPolicy: new AccessPolicy(entitlementRepo),
    entitlementAdminController: new EntitlementAdminController(service)
  };
};
