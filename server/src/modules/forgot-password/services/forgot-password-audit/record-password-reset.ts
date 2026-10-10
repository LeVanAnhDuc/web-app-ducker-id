// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginHistoryService } from "@/modules/login-history/services";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { Logger } from "@/libs/logger";

export const recordPasswordReset = (
  historyService: LoginHistoryService,
  params: {
    email: string;
    auth: AuthenticationDocument;
    req: Request;
  }
): void => {
  const { email, auth, req } = params;

  historyService.recordSuccessfulLogin({
    userId: auth._id,
    usernameAttempted: email,
    loginMethod: LOGIN_METHODS.FORGOT_PASSWORD,
    req
  });

  Logger.info("Forgot password reset completed successfully", { email });
};
