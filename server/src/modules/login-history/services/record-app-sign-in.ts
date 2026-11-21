// types
import type { Schema } from "mongoose";
import type { Request } from "express";
import type { LoginEventApp } from "../types";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// modules
import {
  LOGIN_STATUSES,
  LOGIN_METHODS
} from "@/modules/login-history/constants";
// others
import { logLoginAttempt } from "./shared/log-login-attempt";

/**
 * The IdP handed an authorization code to a satellite app. `interactive`
 * says whether the user had just logged in for it or the code came silently
 * from an existing session.
 */
export const recordAppSignIn = (
  loginHistoryRepo: LoginHistoryRepository,
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
  void logLoginAttempt(loginHistoryRepo, {
    userId: userId.toString(),
    usernameAttempted,
    status: LOGIN_STATUSES.SUCCESS,
    loginMethod: LOGIN_METHODS.SSO,
    app,
    req
  });
};
