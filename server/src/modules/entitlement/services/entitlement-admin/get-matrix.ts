// types
import type { EntitlementMatrixDto } from "../../dtos";
import type { UserRepository } from "@/modules/user/repository/user.repository";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { EntitlementRepository } from "../../repository/entitlement.repository";
// others
import { buildMatrix } from "./shared/build-matrix";
import { resolveUsers } from "./shared/resolve-users";

export const getMatrix = async (
  deps: {
    entitlementRepo: EntitlementRepository;
    userRepo: Pick<UserRepository, "findRolesByIds">;
    webAppRepo: Pick<WebAppRepository, "findAccessRules" | "findAll">;
  },
  userIds: string[]
): Promise<EntitlementMatrixDto> =>
  buildMatrix(deps, await resolveUsers(deps.userRepo, userIds));
