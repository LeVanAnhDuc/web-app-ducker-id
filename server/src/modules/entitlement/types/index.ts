// types
import type { Request } from "express";
import type { Schema } from "mongoose";
import type { ENTITLEMENT_EFFECTS } from "@/modules/entitlement/constants";

export type EntitlementEffect =
  (typeof ENTITLEMENT_EFFECTS)[keyof typeof ENTITLEMENT_EFFECTS];

/**
 * An override of the role default for one user × app pair. A record only
 * exists while the admin's decision differs from what the role would give.
 */
export interface EntitlementDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  webAppId: Schema.Types.ObjectId;
  effect: EntitlementEffect;
  updatedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** One user's overrides, resolved once per request. */
export interface AccessScope {
  role?: string;
  allowIds: string[];
  denyIds: string[];
}

/** The fields of an app the access rule reads. */
export interface AppAccessRule {
  _id: { toString(): string };
  requiredRoles: readonly string[];
}

export interface EntitlementOverride {
  userId: string;
  webAppId: string;
  effect: EntitlementEffect;
}

export interface EntitlementUpsert extends EntitlementOverride {
  updatedBy: string;
}

export interface EntitlementPair {
  userId: string;
  webAppId: string;
}

/** One matrix row: what the user gets and which of it is an exception. */
export interface UserAccess {
  userId: string;
  grantedAppIds: string[];
  overriddenAppIds: string[];
}

export interface EntitlementChange {
  userId: string;
  appId: string;
  granted: boolean;
}

export interface EntitlementMatrixQuery {
  userIds: string[];
}

export interface UpdateEntitlementsBody {
  changes: EntitlementChange[];
}

export interface EntitlementMatrixRequest extends Omit<Request, "query"> {
  query: EntitlementMatrixQuery & Request["query"];
}

export interface UpdateEntitlementsRequest extends Omit<Request, "body"> {
  body: UpdateEntitlementsBody;
}
