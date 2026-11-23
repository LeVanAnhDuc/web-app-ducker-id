// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginHistoryService } from "@/modules/login-history/services";
// modules
import {
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
// others
import { Logger } from "@/libs/logger";

export class ForgotPasswordAuditService {
  constructor(private readonly historyService: LoginHistoryService) {}

  recordInvalidOtp(params: {
    email: string;
    auth: AuthenticationDocument;
    attempts: number;
  }): void {
    const { email, auth, attempts } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
      failReason: LOGIN_FAIL_REASONS.INVALID_OTP
    });

    Logger.warn("Forgot password OTP verification failed", { email, attempts });
  }

  recordInvalidMagicLink(params: {
    email: string;
    auth: AuthenticationDocument;
  }): void {
    const { email, auth } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
      failReason: LOGIN_FAIL_REASONS.INVALID_MAGIC_LINK
    });

    Logger.warn("Forgot password magic link verification failed", { email });
  }

  recordPasswordReset(params: {
    email: string;
    auth: AuthenticationDocument;
  }): void {
    const { email, auth } = params;

    this.historyService.recordSuccessfulLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.FORGOT_PASSWORD
    });

    Logger.info("Forgot password reset completed successfully", { email });
  }
}
