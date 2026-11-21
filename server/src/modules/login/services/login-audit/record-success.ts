// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { LoginHistoryService } from "@/modules/login-history/services";
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
  }
): void => {
  const { auth, user, method } = params;

  historyService.recordSuccessfulLogin({
    userId: auth._id,
    usernameAttempted: user.email,
    loginMethod: method
  });

  Logger.info("Login successful", {
    email: user.email,
    userId: user._id.toString(),
    method
  });
};
