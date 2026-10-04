// types
import type { SetUserActiveResult } from "@/modules/user/types";
import type { UserServiceDeps } from "./deps";
// common
import { ForbiddenError, NotFoundError } from "@/common/exceptions";
// validators
import { validateObjectId } from "@/validators/utils";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

export const setUserActive = async (
  deps: UserServiceDeps,
  id: string,
  isActive: boolean
): Promise<SetUserActiveResult> => {
  validateObjectId(id, "id");

  const target = await deps.userRepo.findAuthIdById(id);
  if (!target) {
    throw new NotFoundError({
      i18nMessage: (t) => t("user:errors.notFound"),
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  if (!isActive && target.authId === RequestContext.requireAuthId()) {
    throw new ForbiddenError({
      i18nMessage: (t) => t("user:errors.cannotLockSelf"),
      code: ERROR_CODES.ADMIN_CANNOT_LOCK_SELF
    });
  }

  if (!isActive) {
    const targetAuth = await deps.authService.findById(target.authId);

    if (
      targetAuth?.roles === AUTHENTICATION_ROLES.ADMIN &&
      targetAuth.isActive
    ) {
      const activeAdmins = await deps.authService.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ForbiddenError({
          i18nMessage: (t) => t("user:errors.cannotLockLastAdmin"),
          code: ERROR_CODES.ADMIN_CANNOT_LOCK_LAST_ADMIN
        });
      }
    }
  }

  await deps.authService.setActive(target.authId, isActive);
  return { _id: id, isActive };
};
