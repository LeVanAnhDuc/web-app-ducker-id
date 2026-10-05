// types
import type { EntitlementMatrixDto } from "../../dtos";
import type { EntitlementAdminServiceDeps } from "./deps";
// others
import { buildMatrix } from "./shared/build-matrix";
import { resolveUsers } from "./shared/resolve-users";

export const getMatrix = async (
  deps: EntitlementAdminServiceDeps,
  userIds: string[]
): Promise<EntitlementMatrixDto> =>
  buildMatrix(deps, await resolveUsers(deps, userIds));
