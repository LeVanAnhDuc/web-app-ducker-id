// types
import type { UserService } from "@/modules/user/user.service";
// common
import { ConflictRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class EmailAvailableGuard {
  constructor(private readonly userService: UserService) {}

  async assert(email: string): Promise<void> {
    const exists = await this.userService.emailExists(email);

    if (exists) {
      Logger.warn("Email already exists", { email });
      throw new ConflictRequestError({
        i18nMessage: (t) => t("signup:errors.emailAlreadyExists"),
        code: ERROR_CODES.SIGNUP_EMAIL_EXISTS
      });
    }
  }
}
