// types
import type { Schema } from "mongoose";
import type { Request } from "express";
import type { LoginFailReason, LoginMethod } from "../types";
import type { LoginHistoryServiceDeps } from "./deps";
// modules
import { LOGIN_STATUSES } from "@/modules/login-history/constants";
// others
import { logLoginAttempt } from "./shared/log-login-attempt";

export const recordFailedLogin = (
  deps: LoginHistoryServiceDeps,
  {
    userId,
    usernameAttempted,
    loginMethod,
    failReason,
    req
  }: {
    userId?: Schema.Types.ObjectId | string | null;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    failReason: LoginFailReason;
    req: Request;
  }
): void => {
  void logLoginAttempt(deps.loginHistoryRepo, {
    userId: userId ? userId.toString() : null,
    usernameAttempted,
    status: LOGIN_STATUSES.FAILED,
    failReason,
    loginMethod,
    req
  });
};
