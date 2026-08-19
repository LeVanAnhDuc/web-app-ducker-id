// types
import type { Request, Response, NextFunction } from "express";
// common
import { ForbiddenError } from "@/common/exceptions";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";
import { authGuard } from "./auth.guard";

const verifyAdminRole = (next: NextFunction): void => {
  const user = RequestContext.getUser();
  if (!user || user.roles !== AUTHENTICATION_ROLES.ADMIN) {
    next(
      new ForbiddenError({
        i18nMessage: (t) => t("common:errors.forbidden"),
        code: ERROR_CODES.AUTH_ADMIN_ONLY
      })
    );
    return;
  }
  next();
};

export const adminGuard = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (RequestContext.getUser()) {
    verifyAdminRole(next);
    return;
  }

  authGuard(req, res, (err) => {
    if (err) return next(err);
    verifyAdminRole(next);
  });
};
