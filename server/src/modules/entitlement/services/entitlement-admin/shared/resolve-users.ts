// types
import type { UserRole } from "@/modules/user/types";
import type { UserRepository } from "@/modules/user/repository/user.repository";
// common
import { NotFoundError } from "@/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";

/** Roles of `userIds` in the given order; any missing user fails the request. */
export const resolveUsers = async (
  userRepo: Pick<UserRepository, "findRolesByIds">,
  userIds: string[]
): Promise<UserRole[]> => {
  const rows = await userRepo.findRolesByIds(userIds);
  const byId = new Map(rows.map((row) => [row.userId, row]));

  return userIds.map((userId) => {
    const row = byId.get(userId);
    if (!row) {
      throw new NotFoundError({
        key: "entitlement:errors.userNotFound",
        code: ERROR_CODES.ENTITLEMENT_USER_NOT_FOUND
      });
    }
    return row;
  });
};
