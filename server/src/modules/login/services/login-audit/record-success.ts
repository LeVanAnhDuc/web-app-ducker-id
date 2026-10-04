// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { UserDocument } from "@/modules/user/types";
import type { LoginMethod } from "@/modules/login-history/types";
// others
import { Logger } from "@/libs/logger";

export const recordSuccess = (
  historyService: LoginHistoryService,
  params: {
    auth: AuthenticationDocument;
    user: UserDocument;
    method: LoginMethod;
    req: Request;
  }
): void => {
  const { auth, user, method, req } = params;

  historyService.recordSuccessfulLogin({
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
};
