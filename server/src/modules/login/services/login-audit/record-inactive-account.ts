// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginHistoryService } from "@/modules/login-history/services";
import type { LoginMethod } from "@/modules/login-history/types";
// modules
import { LOGIN_FAIL_REASONS } from "@/modules/login-history/constants";
// others
import { Logger } from "@/libs/logger";

export const recordInactiveAccount = (
  historyService: LoginHistoryService,
  params: {
    auth: AuthenticationDocument;
    email: string;
    method: LoginMethod;
    req: Request;
  }
): void => {
  const { auth, email, method, req } = params;

  historyService.recordFailedLogin({
    userId: auth._id,
    usernameAttempted: email,
    loginMethod: method,
    failReason: LOGIN_FAIL_REASONS.ACCOUNT_INACTIVE,
    req
  });

  Logger.warn("Account inactive", { email });
};
