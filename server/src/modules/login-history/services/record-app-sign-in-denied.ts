// types
import type { Schema } from "mongoose";
import type { LoginEventApp } from "../types";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// modules
import {
  LOGIN_STATUSES,
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
// others
import { RequestContext } from "@/utils/request-context";
import { logLoginAttempt } from "./shared/log-login-attempt";

export const recordAppSignInDenied = (
  loginHistoryRepo: LoginHistoryRepository,
  {
    userId,
    usernameAttempted,
    app
  }: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    app: LoginEventApp;
  }
): void => {
  void logLoginAttempt(loginHistoryRepo, {
    userId: userId.toString(),
    usernameAttempted,
    status: LOGIN_STATUSES.FAILED,
    failReason: LOGIN_FAIL_REASONS.NOT_ENTITLED,
    loginMethod: LOGIN_METHODS.SSO,
    app,
    client: RequestContext.getClient()
  });
};
