// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { Request } from "express";
import type { PasswordLoginBody } from "../types";
import type { FailedAttemptsRepository } from "../repositories";
import type { LoginResponseDto } from "../dtos";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard
} from "../guards";
import type { LoginAuditService } from "../services/login-audit.service";
import type { LoginCompletionService } from "../services/login-completion.service";
// common
import { TooManyRequestsError, UnauthorizedError } from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger, LogMethod } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { isValidHashedValue } from "@/utils/crypto/bcrypt";
import { LOGIN_LOCKOUT } from "../constants";

export class PasswordLoginStrategy {
  constructor(
    private readonly accountExistsGuard: AccountExistsGuard,
    private readonly accountActiveGuard: AccountActiveGuard,
    private readonly emailVerifiedGuard: EmailVerifiedGuard,
    private readonly passwordLockoutGuard: PasswordLockoutGuard,
    private readonly failedAttemptsRepo: FailedAttemptsRepository,
    private readonly audit: LoginAuditService,
    private readonly completion: LoginCompletionService
  ) {}

  @LogMethod({ name: "Password login" })
  async authenticate(
    body: PasswordLoginBody,
    req: Request
  ): Promise<LoginResponseDto> {
    const { email, password } = body;

    await this.passwordLockoutGuard.assert(email);

    const { auth, user } =
      await this.accountExistsGuard.assertWithCredentialAudit(email, req);

    this.accountActiveGuard.assertWithAudit(
      auth,
      email,
      LOGIN_METHODS.PASSWORD,
      req
    );
    this.emailVerifiedGuard.assertWithAudit(
      auth,
      email,
      LOGIN_METHODS.PASSWORD,
      req
    );

    await this.verifyPasswordOrFail(auth, password, email, req);

    withRetry(() => this.failedAttemptsRepo.resetAll(email), {
      operationName: "resetFailedLoginAttempts",
      context: { email }
    });

    Logger.info("Password login succeeded", { email });

    return this.completion.complete({
      auth,
      user,
      method: LOGIN_METHODS.PASSWORD,
      req
    });
  }

  private async verifyPasswordOrFail(
    auth: AuthenticationDocument,
    password: string,
    email: string,
    req: Request
  ): Promise<void> {
    if (isValidHashedValue(password, auth.password)) return;

    const { attemptCount, lockoutSeconds } =
      await this.failedAttemptsRepo.trackAttempt(email);
    this.audit.recordInvalidPassword({ auth, email, attemptCount, req });

    if (attemptCount >= LOGIN_LOCKOUT.MAX_ATTEMPTS && lockoutSeconds > 0) {
      throw new TooManyRequestsError({
        i18nMessage: (t) =>
          t("login:errors.accountLocked", {
            attempts: attemptCount,
            seconds: lockoutSeconds
          }),
        code: ERROR_CODES.LOGIN_ACCOUNT_LOCKED
      });
    }

    throw new UnauthorizedError({
      i18nMessage: (t) => t("login:errors.invalidCredentials"),
      code: ERROR_CODES.LOGIN_INVALID_CREDENTIALS
    });
  }
}
