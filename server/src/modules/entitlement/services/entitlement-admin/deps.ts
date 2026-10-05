// types
import type { UserRepository } from "@/modules/user/repository/user.repository";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { EntitlementRepository } from "../../repository/entitlement.repository";

export interface EntitlementAdminServiceDeps {
  entitlementRepo: EntitlementRepository;
  userRepo: Pick<UserRepository, "findRolesByIds">;
  webAppRepo: Pick<WebAppRepository, "findAccessRules">;
}
