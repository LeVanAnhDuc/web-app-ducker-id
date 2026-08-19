// types
import type { UserDocument } from "@/modules/user/types";
// common
import { ForbiddenError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

type UserForToken = {
  _id: UserDocument["_id"];
  email: string;
  fullName: string;
  avatar?: string | null;
};

export class UserExistsGuard {
  assert(
    user: UserForToken | null,
    authId: string
  ): asserts user is UserForToken {
    if (!user) {
      Logger.warn("Token refresh rejected - user profile not found", {
        authId
      });
      throw new ForbiddenError({
        i18nMessage: (t) => t("login:errors.invalidRefreshToken"),
        code: ERROR_CODES.REFRESH_TOKEN_INVALID
      });
    }
  }
}
