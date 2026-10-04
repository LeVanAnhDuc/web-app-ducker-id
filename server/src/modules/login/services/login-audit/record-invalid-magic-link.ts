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

export const recordInvalidMagicLink = (
  historyService: LoginHistoryService,
  params: {
    auth: AuthenticationDocument;
    email: string;
    req: Request;
  }
): void => {
  const { auth, email, req } = params;

  historyService.recordFailedLogin({
    userId: auth._id,
    usernameAttempted: email,
    loginMethod: LOGIN_METHODS.MAGIC_LINK,
    failReason: LOGIN_FAIL_REASONS.INVALID_MAGIC_LINK,
    req
  });

  Logger.warn("Magic link verification failed - invalid token", { email });
};
