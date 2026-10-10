// types
import type {
  EntitlementChange,
  EntitlementPair,
  EntitlementUpsert
} from "../../types";
import type { EntitlementMatrixDto } from "../../dtos";
import type { EntitlementAdminServiceDeps } from "./deps";
// common
import { NotFoundError } from "@/common/exceptions";
// modules
import {
  NOTIFICATION_LINKS,
  NOTIFICATION_TYPES
} from "@/modules/notification/constants";
import { WEB_APP_STATUSES } from "@/modules/web-app/constants";
// constants
import { ENTITLEMENT_EFFECTS } from "../../constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import {
  canAccessApp,
  roleAllows,
  toAccessScope
} from "../../entitlement.helper";
import { buildMatrix } from "./shared/build-matrix";
import { resolveUsers } from "./shared/resolve-users";

const unique = (values: string[]): string[] => [...new Set(values)];

/**
 * Tells each user whose effective access actually flipped — not every pair
 * the admin touched: re-saving a granted app, or swapping an `allow` for the
 * role default, changes nothing the user can see. Apps that are not active
 * stay silent, since the launcher would not show them anyway.
 *
 * Never throws: the admin's save already succeeded.
 */
const notifyAccessChanges = async (
  deps: EntitlementAdminServiceDeps,
  flipped: EntitlementChange[]
): Promise<void> => {
  if (flipped.length === 0) return;

  try {
    const appIds = unique(flipped.map((change) => change.appId));
    const apps = await deps.webAppRepo.findAll({ _id: { $in: appIds } });
    const nameById = new Map(
      apps
        .filter((app) => app.status === WEB_APP_STATUSES.ACTIVE)
        .map((app) => [app._id.toString(), app.displayName])
    );

    flipped.forEach(({ userId, appId, granted }) => {
      const appName = nameById.get(appId);
      if (!appName) return;
      deps.notificationDispatcher.notify({
        userId,
        type: granted
          ? NOTIFICATION_TYPES.ENTITLEMENT_GRANTED
          : NOTIFICATION_TYPES.ENTITLEMENT_REVOKED,
        params: { appName },
        link: granted
          ? `${NOTIFICATION_LINKS.APPS}?search=${encodeURIComponent(appName)}`
          : null
      });
    });
  } catch (error) {
    Logger.error("Failed to notify entitlement changes", { error });
  }
};

/**
 * Every change is checked before anything is written, so a bad id at the end
 * of a batch cannot leave the first half applied. The admin sends the value
 * they want; whether that needs an override is decided here, against the
 * role default (DR-4) — a value equal to the default removes the override.
 */
export const updateMatrix = async (
  deps: EntitlementAdminServiceDeps,
  changes: EntitlementChange[],
  actorId: string
): Promise<EntitlementMatrixDto> => {
  const users = await resolveUsers(
    deps,
    unique(changes.map((change) => change.userId))
  );
  const appIds = unique(changes.map((change) => change.appId));
  const apps = await deps.webAppRepo.findAccessRules(appIds);
  const appById = new Map(apps.map((app) => [app._id.toString(), app]));
  if (appById.size !== appIds.length) {
    throw new NotFoundError({
      i18nMessage: (t) => t("entitlement:errors.appNotFound"),
      code: ERROR_CODES.ENTITLEMENT_APP_NOT_FOUND
    });
  }
  const roleById = new Map(users.map((user) => [user.userId, user.role]));
  const overrides = await deps.entitlementRepo.findByUsers(
    users.map((user) => user.userId)
  );
  const flipped: EntitlementChange[] = [];

  const upserts: EntitlementUpsert[] = [];
  const deletes: EntitlementPair[] = [];
  changes.forEach(({ userId, appId, granted }) => {
    const app = appById.get(appId)!;
    const pair = { userId, webAppId: appId };
    const before = toAccessScope(userId, roleById.get(userId), overrides);
    if (canAccessApp(app, before) !== granted) {
      flipped.push({ userId, appId, granted });
    }
    if (granted === roleAllows(roleById.get(userId), app.requiredRoles)) {
      deletes.push(pair);
      return;
    }
    upserts.push({
      ...pair,
      effect: granted ? ENTITLEMENT_EFFECTS.ALLOW : ENTITLEMENT_EFFECTS.DENY,
      updatedBy: actorId
    });
  });

  await deps.entitlementRepo.applyChanges({ upserts, deletes });
  await notifyAccessChanges(deps, flipped);

  return buildMatrix(deps, users);
};
