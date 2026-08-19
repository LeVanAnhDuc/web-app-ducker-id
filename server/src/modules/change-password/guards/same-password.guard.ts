// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";

export class SamePasswordGuard {
  assert(currentPassword: string, newPassword: string): void {
    if (currentPassword !== newPassword) return;

    throw new BadRequestError({
      i18nMessage: (t) => t("changePassword:errors.sameAsCurrent"),
      code: ERROR_CODES.CHANGE_PASSWORD_SAME_AS_CURRENT
    });
  }
}
