// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { UserDocument } from "@/modules/user/types";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { Request } from "express";
import type { PasswordLoginBody } from "../../types";
import type { FailedAttemptsRepository } from "../../repositories/failed-attempts.repository";
import type { LoginResponseDto } from "../../dtos";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard
} from "../../guards";
import type { LoginAuditService } from "../../services/login-audit";
import type { LoginCompletionService } from "../../services/login-completion";
// common
import { TooManyRequestsError, UnauthorizedError } from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
import {
  NOTIFICATION_LINKS,
  NOTIFICATION_TYPES
} from "@/modules/notification/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger, LogMethod } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { isValidHashedValue } from "@/utils/crypto/bcrypt";
import { LOGIN_LOCKOUT } from "../../constants";

export class PasswordLoginStrategy {
  constructor(
    private readonly accountExistsGuard: AccountExistsGuard,
    private readonly accountActiveGuard: AccountActiveGuard,
    private readonly emailVerifiedGuard: EmailVerifiedGuard,
    private readonly passwordLockoutGuard: PasswordLockoutGuard,
    private readonly failedAttemptsRepo: FailedAttemptsRepository,
    private readonly audit: LoginAuditService,
    private readonly completion: LoginCompletionService,
    private readonly notifications: NotificationDispatcher
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

    await this.verifyPasswordOrFail(auth, user, password, email, req);

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
    user: UserDocument,
    password: string,
    email: string,
    req: Request
  ): Promise<void> {
    if (isValidHashedValue(password, auth.password)) return;

    const { attemptCount, lockoutSeconds } =
      await this.failedAttemptsRepo.trackAttempt(email);
    this.audit.recordInvalidPassword({ auth, email, attemptCount, req });

    if (attemptCount >= LOGIN_LOCKOUT.MAX_ATTEMPTS && lockoutSeconds > 0) {
      // The owner cannot sign in while locked; the notification is there for
      // them to find once they are back in (the email is the immediate alert).
      this.notifications.notify({
        userId: user._id.toString(),
        type: NOTIFICATION_TYPES.ACCOUNT_LOCKED,
        params: { minutes: Math.ceil(lockoutSeconds / 60) },
        link: NOTIFICATION_LINKS.LOGIN_HISTORY
      });

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
