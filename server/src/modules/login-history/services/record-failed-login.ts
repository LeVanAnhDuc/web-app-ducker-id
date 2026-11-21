// types
import type { Schema } from "mongoose";
import type { LoginFailReason, LoginMethod } from "../types";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// modules
import { LOGIN_STATUSES } from "@/modules/login-history/constants";
// others
import { RequestContext } from "@/utils/request-context";
import { logLoginAttempt } from "./shared/log-login-attempt";

export const recordFailedLogin = (
  loginHistoryRepo: LoginHistoryRepository,
  {
    userId,
    usernameAttempted,
    loginMethod,
    failReason
  }: {
    userId?: Schema.Types.ObjectId | string | null;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    failReason: LoginFailReason;
  }
): void => {
  void logLoginAttempt(loginHistoryRepo, {
    userId: userId ? userId.toString() : null,
    usernameAttempted,
    status: LOGIN_STATUSES.FAILED,
    failReason,
    loginMethod,
    client: RequestContext.getClient()
  });
};
