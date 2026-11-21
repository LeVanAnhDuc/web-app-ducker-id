// types
import type { UserRole } from "@/modules/user/types";
import type { EntitlementMatrixDto } from "../../../dtos";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { EntitlementRepository } from "../../../repository/entitlement.repository";
// dtos
import { toEntitlementMatrixDto } from "../../../dtos";
// others
import { toAccessScope, toUserAccess } from "../../../entitlement.helper";

/** Rows for `users` against the whole catalog, read fresh from the store. */
export const buildMatrix = async (
  deps: {
    entitlementRepo: EntitlementRepository;
    webAppRepo: Pick<WebAppRepository, "findAccessRules" | "findAll">;
  },
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
