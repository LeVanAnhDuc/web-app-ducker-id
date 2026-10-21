// types
import type { RequestHandler } from "express";
// common
import { ForbiddenError, UnauthorizedError } from "@/exceptions";
// modules
import { verifyAccessToken } from "@/modules/token/helpers";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

/**
 * `allowPasswordChangeRequired`: a session signed in with a temporary password
 * carries `mustChangePassword` in its access token, and the API — not only the
 * client gate — refuses it everywhere except the routes that let the user out
 * of that state: change-password and logout (REQ-PASSWORD-04).
 */
const createAuthGuard =
  ({
    allowPasswordChangeRequired
  }: {
    allowPasswordChangeRequired: boolean;
  }): RequestHandler =>
  (req, _res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError({
          key: "common:errors.unauthorized",
          code: ERROR_CODES.AUTH_MISSING_TOKEN
        });
      }

      const token = authHeader.substring(7);

      if (!token) {
        throw new UnauthorizedError({
          key: "common:errors.unauthorized",
          code: ERROR_CODES.AUTH_MISSING_TOKEN
        });
      }

      const payload = verifyAccessToken(token);

      if (!payload || !payload.sub || !payload.authId) {
        throw new UnauthorizedError({
          key: "common:errors.invalidToken",
          code: ERROR_CODES.AUTH_INVALID_TOKEN
        });
      }

      if (payload.mustChangePassword && !allowPasswordChangeRequired) {
        throw new ForbiddenError({
          key: "common:errors.passwordChangeRequired",
          code: ERROR_CODES.AUTH_PASSWORD_CHANGE_REQUIRED
        });
      }

      RequestContext.setUser({
        sub: payload.sub,
        authId: payload.authId,
        roles: payload.roles
      });

      next();
    } catch (error) {
      next(error);
    }
  };

export const authGuard = createAuthGuard({
  allowPasswordChangeRequired: false
});

/** Only for change-password and logout — see `createAuthGuard`. */
export const passwordChangeAuthGuard = createAuthGuard({
  allowPasswordChangeRequired: true
});
