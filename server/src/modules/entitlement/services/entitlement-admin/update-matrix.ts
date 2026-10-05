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
// constants
import { ENTITLEMENT_EFFECTS } from "../../constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { roleAllows } from "../../entitlement.helper";
import { buildMatrix } from "./shared/build-matrix";
import { resolveUsers } from "./shared/resolve-users";

const unique = (values: string[]): string[] => [...new Set(values)];

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

  const upserts: EntitlementUpsert[] = [];
  const deletes: EntitlementPair[] = [];
  changes.forEach(({ userId, appId, granted }) => {
    const app = appById.get(appId)!;
    const pair = { userId, webAppId: appId };
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

  return buildMatrix(deps, users);
};
