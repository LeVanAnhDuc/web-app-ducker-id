// types
import type { LoginHistoryService } from "@/modules/login-history/services";
// modules
import {
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
// others
import { Logger } from "@/libs/logger";

export const recordInvalidCredentials = (
  historyService: LoginHistoryService,
  params: { email: string }
): void => {
  const { email } = params;

  historyService.recordFailedLogin({
    userId: null,
    usernameAttempted: email,
    loginMethod: LOGIN_METHODS.PASSWORD,
    failReason: LOGIN_FAIL_REASONS.INVALID_CREDENTIALS
  });

  Logger.warn("Login failed - email not found", { email });
};
