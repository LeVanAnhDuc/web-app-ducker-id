// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type { WebAppDocument } from "@/modules/web-app/types";
import type {
  AccessScope,
  AppAccessRule,
  EntitlementOverride,
  UserAccess
} from "./types";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import { ENTITLEMENT_EFFECTS } from "./constants";

const toObjectIds = (ids: string[]): Types.ObjectId[] =>
  ids.map((id) => new Types.ObjectId(id));

/**
 * The role default: an app with no required role is open to everyone, an
 * admin qualifies for every app, anyone else needs their role listed. A
 * missing role is treated as `user`, the role every signup gets.
 */
export const roleAllows = (
  role: string | undefined,
  requiredRoles: readonly string[]
): boolean =>
  requiredRoles.length === 0 ||
  role === AUTHENTICATION_ROLES.ADMIN ||
  requiredRoles.includes(role ?? AUTHENTICATION_ROLES.USER);

/** Effective access for one app — an override always beats the role default. */
export const canAccessApp = (
  app: AppAccessRule,
  scope: AccessScope
): boolean => {
  const appId = app._id.toString();
  if (scope.denyIds.includes(appId)) return false;
  if (scope.allowIds.includes(appId)) return true;
  return roleAllows(scope.role, app.requiredRoles);
};

/**
 * The list form of `canAccessApp`, as clauses for the caller to push into
 * `$and` — the web-app filter already uses `$or` for search and `_id` for id
 * lists, so merging these as plain keys would overwrite one of them.
 */
export const buildAccessFilter = (
  scope: AccessScope
): FilterQuery<WebAppDocument>[] => {
  const clauses: FilterQuery<WebAppDocument>[] = [];

  if (scope.role !== AUTHENTICATION_ROLES.ADMIN) {
    const allowed: FilterQuery<WebAppDocument>[] = [
      { requiredRoles: { $size: 0 } },
      { requiredRoles: scope.role ?? AUTHENTICATION_ROLES.USER }
    ];
    if (scope.allowIds.length > 0) {
      allowed.push({ _id: { $in: toObjectIds(scope.allowIds) } });
    }
    clauses.push({ $or: allowed });
  }

  if (scope.denyIds.length > 0) {
    clauses.push({ _id: { $nin: toObjectIds(scope.denyIds) } });
  }

  return clauses;
};

/** Builds the scope of one user from their overrides (any user's rows may be passed). */
export const toAccessScope = (
  userId: string,
  role: string | undefined,
  overrides: EntitlementOverride[]
): AccessScope => {
  const scope: AccessScope = { role, allowIds: [], denyIds: [] };
  overrides
    .filter((row) => row.userId === userId)
    .forEach(({ webAppId, effect }) => {
      if (effect === ENTITLEMENT_EFFECTS.ALLOW) scope.allowIds.push(webAppId);
      else scope.denyIds.push(webAppId);
    });
  return scope;
};

/** One matrix row over the given catalog, in catalog order. */
export const toUserAccess = (
  userId: string,
  scope: AccessScope,
  apps: AppAccessRule[]
): UserAccess => {
  const overridden = new Set([...scope.allowIds, ...scope.denyIds]);
  return {
    userId,
    grantedAppIds: apps
      .filter((app) => canAccessApp(app, scope))
      .map((app) => app._id.toString()),
    overriddenAppIds: apps
      .map((app) => app._id.toString())
      .filter((id) => overridden.has(id))
  };
};
