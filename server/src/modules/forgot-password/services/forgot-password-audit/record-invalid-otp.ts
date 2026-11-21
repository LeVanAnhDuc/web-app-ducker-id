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

export const recordInvalidOtp = (
  historyService: LoginHistoryService,
  params: {
    email: string;
    auth: AuthenticationDocument;
    attempts: number;
  }
): void => {
  const { email, auth, attempts } = params;

  historyService.recordFailedLogin({
    userId: auth._id,
    usernameAttempted: email,
    loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
    failReason: LOGIN_FAIL_REASONS.INVALID_OTP
  });

  Logger.warn("Forgot password OTP verification failed", { email, attempts });
};
