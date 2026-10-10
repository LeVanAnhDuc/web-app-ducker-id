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

export const recordInvalidMagicLink = (
  historyService: LoginHistoryService,
  params: {
    email: string;
    auth: AuthenticationDocument;
    req: Request;
  }
): void => {
  const { email, auth, req } = params;

  historyService.recordFailedLogin({
    userId: auth._id,
    usernameAttempted: email,
    loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
    failReason: LOGIN_FAIL_REASONS.INVALID_MAGIC_LINK,
    req
  });

  Logger.warn("Forgot password magic link verification failed", { email });
};
