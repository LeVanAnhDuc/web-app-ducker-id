// types
import type { Schema } from "mongoose";
import type { Request } from "express";
import type { LoginEventApp } from "../types";
import type { LoginHistoryServiceDeps } from "./deps";
// modules
import {
  LOGIN_STATUSES,
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
// others
import { logLoginAttempt } from "./shared/log-login-attempt";

export const recordAppSignInDenied = (
  deps: LoginHistoryServiceDeps,
  {
    userId,
    usernameAttempted,
    app,
    req
  }: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    app: LoginEventApp;
    req: Request;
  }
): void => {
  void logLoginAttempt(deps.loginHistoryRepo, {
    userId: userId.toString(),
    usernameAttempted,
    status: LOGIN_STATUSES.FAILED,
    failReason: LOGIN_FAIL_REASONS.NOT_ENTITLED,
    loginMethod: LOGIN_METHODS.SSO,
    app,
    req
  });
};
