// types
import type { UserAccess } from "../types";

export interface UserAccessDto {
  userId: string;
  grantedAppIds: string[];
  overriddenAppIds: string[];
}

/** GET and PATCH answer the same shape, so the client resets from either. */
export interface EntitlementMatrixDto {
  users: UserAccessDto[];
}

export const toEntitlementMatrixDto = (
  rows: UserAccess[]
): EntitlementMatrixDto => ({
  users: rows.map((row) => ({
    userId: row.userId,
    grantedAppIds: [...row.grantedAppIds],
    overriddenAppIds: [...row.overriddenAppIds]
  }))
});
