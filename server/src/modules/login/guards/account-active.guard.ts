// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginMethod } from "@/modules/login-history/types";
import type { Request } from "express";
import type { LoginAuditService } from "../services/login-audit.service";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";

export class AccountActiveGuard {
  constructor(private readonly audit: LoginAuditService) {}

  assert(auth: AuthenticationDocument): void {
    if (auth.isActive) return;

    throw new UnauthorizedError({
      i18nMessage: (t) => t("login:errors.accountInactive"),
      code: ERROR_CODES.LOGIN_ACCOUNT_INACTIVE
    });
  }

  assertWithAudit(
    auth: AuthenticationDocument,
    email: string,
    method: LoginMethod,
    req: Request
  ): void {
    if (auth.isActive) return;

    this.audit.recordInactiveAccount({ auth, email, method, req });
    throw new UnauthorizedError({
      i18nMessage: (t) => t("login:errors.accountInactive"),
      code: ERROR_CODES.LOGIN_ACCOUNT_INACTIVE
    });
  }
}
