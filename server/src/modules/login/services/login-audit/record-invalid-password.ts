// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginHistoryService } from "@/modules/login-history/services";
// modules
import {
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
// others
import { Logger } from "@/libs/logger";

export const recordInvalidPassword = (
  historyService: LoginHistoryService,
  params: {
    auth: AuthenticationDocument;
    email: string;
    attemptCount: number;
    req: Request;
  }
): void => {
  const { auth, email, attemptCount, req } = params;

  historyService.recordFailedLogin({
    userId: auth._id,
    usernameAttempted: email,
    loginMethod: LOGIN_METHODS.PASSWORD,
    failReason: LOGIN_FAIL_REASONS.INVALID_PASSWORD,
    req
  });

  Logger.warn("Login failed - invalid password", { email, attemptCount });
};
