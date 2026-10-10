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

export const recordInvalidOtp = (
  historyService: LoginHistoryService,
  params: {
    auth: AuthenticationDocument;
    email: string;
    attempts: number;
    req: Request;
  }
): void => {
  const { auth, email, attempts, req } = params;

  historyService.recordFailedLogin({
    userId: auth._id,
    usernameAttempted: email,
    loginMethod: LOGIN_METHODS.OTP,
    failReason: LOGIN_FAIL_REASONS.INVALID_OTP,
    req
  });

  Logger.warn("Login OTP verification failed", { email, attempts });
};
