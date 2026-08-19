// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
// common
import { ForbiddenError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class AuthActiveGuard {
  assert(
    auth: AuthenticationDocument | null,
    authId: string
  ): asserts auth is AuthenticationDocument {
    if (!auth || !auth.isActive) {
      Logger.warn("Token refresh rejected - account missing or inactive", {
        authId
      });
      throw new ForbiddenError({
        i18nMessage: (t) => t("login:errors.invalidRefreshToken"),
        code: ERROR_CODES.REFRESH_TOKEN_INVALID
      });
    }
  }
}
