// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
// common
import { ForbiddenError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

/**
 * Why `tokenVersion`, not JWT `iat`: `iat` is second-granular, so a refresh
 * token issued in the same second as a password change is indistinguishable
 * from one issued just before it. `tokenVersion` has no such ambiguity.
 *
 * Why `?? 0`: tokens predating this field carry no version claim; treating
 * them as 0 keeps existing sessions valid until the next password change.
 */
export class PasswordNotChangedGuard {
  assert(auth: AuthenticationDocument, payload: RefreshTokenPayload): void {
    if (!auth) return;

    const tokenVersion = payload.tokenVersion ?? 0;

    if (tokenVersion < auth.tokenVersion) {
      Logger.warn(
        "Token refresh rejected - password changed after token issued",
        { authId: payload.authId }
      );
      throw new ForbiddenError({
        i18nMessage: (t) =>
          t("forgotPassword:errors.passwordChangedPleaseLogin"),
        code: ERROR_CODES.AUTH_PASSWORD_CHANGED
      });
    }
  }
}
