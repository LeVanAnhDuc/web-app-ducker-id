// common
import { BadRequestError } from "@/common/exceptions";
// others
import { isValidHashedValue } from "@/utils/crypto/bcrypt";
import { ERROR_CODES } from "@/constants/error-code";

export class WrongCurrentPasswordGuard {
  assert(currentPassword: string, storedHash: string): void {
    if (isValidHashedValue(currentPassword, storedHash)) return;

    throw new BadRequestError({
      i18nMessage: (t) => t("changePassword:errors.wrongCurrentPassword"),
      code: ERROR_CODES.CHANGE_PASSWORD_WRONG_CURRENT
    });
  }
}
