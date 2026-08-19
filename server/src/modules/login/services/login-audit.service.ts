// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { UserDocument } from "@/modules/user/types";
import type { LoginMethod } from "@/modules/login-history/types";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
// modules
import {
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
// others
import { Logger } from "@/libs/logger";

export class LoginAuditService {
  constructor(private readonly historyService: LoginHistoryService) {}

  recordSuccess(params: {
    auth: AuthenticationDocument;
    user: UserDocument;
    method: LoginMethod;
    req: Request;
  }): void {
    const { auth, user, method, req } = params;

    this.historyService.recordSuccessfulLogin({
      userId: auth._id,
      usernameAttempted: user.email,
      loginMethod: method,
      req
    });

    Logger.info("Login successful", {
      email: user.email,
      userId: user._id.toString(),
      method
    });
  }

  recordInvalidCredentials(params: { email: string; req: Request }): void {
    const { email, req } = params;

    this.historyService.recordFailedLogin({
      userId: null,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.PASSWORD,
      failReason: LOGIN_FAIL_REASONS.INVALID_CREDENTIALS,
      req
    });

    Logger.warn("Login failed - email not found", { email });
  }

  recordInvalidPassword(params: {
    auth: AuthenticationDocument;
    email: string;
    attemptCount: number;
    req: Request;
  }): void {
    const { auth, email, attemptCount, req } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.PASSWORD,
      failReason: LOGIN_FAIL_REASONS.INVALID_PASSWORD,
      req
    });

    Logger.warn("Login failed - invalid password", { email, attemptCount });
  }

  recordInactiveAccount(params: {
    auth: AuthenticationDocument;
    email: string;
    method: LoginMethod;
    req: Request;
  }): void {
    const { auth, email, method, req } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: method,
      failReason: LOGIN_FAIL_REASONS.ACCOUNT_INACTIVE,
      req
    });

    Logger.warn("Account inactive", { email });
  }

  recordEmailNotVerified(params: {
    auth: AuthenticationDocument;
    email: string;
    method: LoginMethod;
    req: Request;
  }): void {
    const { auth, email, method, req } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: method,
      failReason: LOGIN_FAIL_REASONS.EMAIL_NOT_VERIFIED,
      req
    });

    Logger.warn("Email not verified", { email });
  }

  recordInvalidOtp(params: {
    auth: AuthenticationDocument;
    email: string;
    attempts: number;
    req: Request;
  }): void {
    const { auth, email, attempts, req } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.OTP,
      failReason: LOGIN_FAIL_REASONS.INVALID_OTP,
      req
    });

    Logger.warn("Login OTP verification failed", { email, attempts });
  }

  recordInvalidMagicLink(params: {
    auth: AuthenticationDocument;
    email: string;
    req: Request;
  }): void {
    const { auth, email, req } = params;

    this.historyService.recordFailedLogin({
      userId: auth._id,
      usernameAttempted: email,
      loginMethod: LOGIN_METHODS.MAGIC_LINK,
      failReason: LOGIN_FAIL_REASONS.INVALID_MAGIC_LINK,
      req
    });

    Logger.warn("Magic link verification failed - invalid token", { email });
  }
}
