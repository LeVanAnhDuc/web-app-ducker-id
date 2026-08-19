// types
import type { UserService } from "@/modules/user/user.service";
import type { UserWithAuth } from "@/modules/user/types";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class AuthExistsGuard {
  constructor(private readonly userService: UserService) {}

  tryFind(email: string): Promise<UserWithAuth | null> {
    return this.userService.findByEmailWithAuth(email);
  }

  async assert(email: string): Promise<UserWithAuth> {
    const result = await this.tryFind(email);

    if (!result) {
      Logger.warn("Unlock verify failed - account not found", { email });
      throw new UnauthorizedError({
        i18nMessage: (t) => t("unlockAccount:errors.invalidTempPassword"),
        code: ERROR_CODES.UNLOCK_AUTH_NOT_FOUND
      });
    }

    return result;
  }
}
