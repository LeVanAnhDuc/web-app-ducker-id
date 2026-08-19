// types
import type { UserService } from "@/modules/user/user.service";
import type { UserWithAuth } from "@/modules/user/types";
import type { Request } from "express";
import type { LoginAuditService } from "../services/login-audit.service";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class AccountExistsGuard {
  constructor(
    private readonly userService: UserService,
    private readonly audit: LoginAuditService
  ) {}

  tryFind(email: string): Promise<UserWithAuth | null> {
    return this.userService.findByEmailWithAuth(email);
  }

  isLoginEligible(result: UserWithAuth | null): boolean {
    return (
      result?.auth.isActive === true && result?.auth.verifiedEmail === true
    );
  }

  async assert(email: string): Promise<UserWithAuth> {
    const result = await this.userService.findByEmailWithAuth(email);

    if (result) return result;

    Logger.warn("Authentication not found", { email });
    throw new UnauthorizedError({
      i18nMessage: (t) => t("login:errors.invalidEmail"),
      code: ERROR_CODES.LOGIN_INVALID_EMAIL
    });
  }

  async assertWithCredentialAudit(
    email: string,
    req: Request
  ): Promise<UserWithAuth> {
    const result = await this.userService.findByEmailWithAuth(email);

    if (result) return result;

    this.audit.recordInvalidCredentials({ email, req });
    throw new UnauthorizedError({
      i18nMessage: (t) => t("login:errors.invalidCredentials"),
      code: ERROR_CODES.LOGIN_INVALID_CREDENTIALS
    });
  }
}
