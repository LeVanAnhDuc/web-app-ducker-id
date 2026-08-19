// types
import type { RequestHandler } from "express";
// common
import { UnauthorizedError } from "@/common/exceptions";
// modules
import { verifyAccessToken } from "@/modules/token/helpers";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

export const authGuard: RequestHandler = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError({
        i18nMessage: (t) => t("common:errors.unauthorized"),
        code: ERROR_CODES.AUTH_MISSING_TOKEN
      });
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new UnauthorizedError({
        i18nMessage: (t) => t("common:errors.unauthorized"),
        code: ERROR_CODES.AUTH_MISSING_TOKEN
      });
    }

    const payload = verifyAccessToken(token);

    if (!payload || !payload.sub || !payload.authId) {
      throw new UnauthorizedError({
        i18nMessage: (t) => t("common:errors.invalidToken"),
        code: ERROR_CODES.AUTH_INVALID_TOKEN
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
