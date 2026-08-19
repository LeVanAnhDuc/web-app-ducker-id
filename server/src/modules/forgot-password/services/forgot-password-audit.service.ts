// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
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
    req: Request;
  }): void {
    const { email, auth, attempts, req } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
      failReason: LOGIN_FAIL_REASONS.INVALID_OTP,
      req
    });

    Logger.warn("Forgot password OTP verification failed", { email, attempts });
  }

  recordInvalidMagicLink(params: {
    email: string;
    auth: AuthenticationDocument;
    req: Request;
  }): void {
    const { email, auth, req } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
      failReason: LOGIN_FAIL_REASONS.INVALID_MAGIC_LINK,
      req
    });

    Logger.warn("Forgot password magic link verification failed", { email });
  }

  recordPasswordReset(params: {
    email: string;
    auth: AuthenticationDocument;
    req: Request;
  }): void {
    const { email, auth, req } = params;

    this.historyService.recordSuccessfulLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
      req
    });

    Logger.info("Forgot password reset completed successfully", { email });
  }
}
