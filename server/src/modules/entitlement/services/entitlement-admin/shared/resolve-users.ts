// types
import type { UserRole } from "@/modules/user/types";
import type { EntitlementAdminServiceDeps } from "../deps";
// common
import { NotFoundError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";

/** Roles of `userIds` in the given order; any missing user fails the request. */
export const resolveUsers = async (
  deps: EntitlementAdminServiceDeps,
  userIds: string[]
): Promise<UserRole[]> => {
  const rows = await deps.userRepo.findRolesByIds(userIds);
  const byId = new Map(rows.map((row) => [row.userId, row]));

  return userIds.map((userId) => {
    const row = byId.get(userId);
    if (!row) {
      throw new NotFoundError({
        i18nMessage: (t) => t("entitlement:errors.userNotFound"),
        code: ERROR_CODES.ENTITLEMENT_USER_NOT_FOUND
      });
    }
    return row;
  });
};
