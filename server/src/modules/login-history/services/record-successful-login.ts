// types
import type { Schema } from "mongoose";
import type { Request } from "express";
import type { LoginMethod } from "../types";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// modules
import { LOGIN_STATUSES } from "@/modules/login-history/constants";
// others
import { logLoginAttempt } from "./shared/log-login-attempt";

export const recordSuccessfulLogin = (
  loginHistoryRepo: LoginHistoryRepository,
  {
    userId,
    usernameAttempted,
    loginMethod,
    req
  }: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    req: Request;
  }
): void => {
  void logLoginAttempt(loginHistoryRepo, {
    userId: userId.toString(),
    usernameAttempted,
    status: LOGIN_STATUSES.SUCCESS,
    loginMethod,
    req
  });
};
