// types
import type { UserRole } from "@/modules/user/types";
import type { EntitlementMatrixDto } from "../../../dtos";
import type { EntitlementAdminServiceDeps } from "../deps";
// dtos
import { toEntitlementMatrixDto } from "../../../dtos";
// others
import { toAccessScope, toUserAccess } from "../../../entitlement.helper";

/** Rows for `users` against the whole catalog, read fresh from the store. */
export const buildMatrix = async (
  deps: EntitlementAdminServiceDeps,
  users: UserRole[]
): Promise<EntitlementMatrixDto> => {
  const [catalog, overrides] = await Promise.all([
    deps.webAppRepo.findAccessRules(),
    deps.entitlementRepo.findByUsers(users.map((user) => user.userId))
  ]);

  return toEntitlementMatrixDto(
    users.map(({ userId, role }) =>
      toUserAccess(userId, toAccessScope(userId, role, overrides), catalog)
    )
  );
};
