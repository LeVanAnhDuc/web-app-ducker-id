// types
import type { PaginatedResult } from "@/common/pagination";
import type { Schema } from "mongoose";
import type { Request } from "express";
import type {
  LoginEventApp,
  LoginFailReason,
  LoginHistoryAdminQuery,
  LoginHistoryQuery,
  LoginMethod
} from "../types";
import type {
  AllHistoryItemDto,
  HistoryDetailItemDto,
  MyHistoryItemDto,
  MyLoginStatsDto
} from "../dtos";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// others
import { getAllLoginHistory } from "./get-all-login-history";
import { getLoginHistoryDetail } from "./get-login-history-detail";
import { getMyLoginHistory } from "./get-my-login-history";
import { getMyLoginStats } from "./get-my-login-stats";
import { recordAppSignIn } from "./record-app-sign-in";
import { recordAppSignInDenied } from "./record-app-sign-in-denied";
import { recordFailedLogin } from "./record-failed-login";
import { recordSuccessfulLogin } from "./record-successful-login";

export class LoginHistoryService {
  constructor(private readonly loginHistoryRepo: LoginHistoryRepository) {}

  recordSuccessfulLogin(params: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    req: Request;
  }): void {
    recordSuccessfulLogin(this.loginHistoryRepo, params);
  }

  recordFailedLogin(params: {
    userId?: Schema.Types.ObjectId | string | null;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    failReason: LoginFailReason;
    req: Request;
  }): void {
    recordFailedLogin(this.loginHistoryRepo, params);
  }

  recordAppSignIn(params: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    app: LoginEventApp;
    req: Request;
  }): void {
    recordAppSignIn(this.loginHistoryRepo, params);
  }

  recordAppSignInDenied(params: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    app: LoginEventApp;
    req: Request;
  }): void {
    recordAppSignInDenied(this.loginHistoryRepo, params);
  }

  getMyLoginHistory(
    query: LoginHistoryQuery
  ): Promise<PaginatedResult<MyHistoryItemDto>> {
    return getMyLoginHistory(this.loginHistoryRepo, query);
  }

  getMyLoginStats(): Promise<MyLoginStatsDto> {
    return getMyLoginStats(this.loginHistoryRepo);
  }

  getAllLoginHistory(
    query: LoginHistoryAdminQuery
  ): Promise<PaginatedResult<AllHistoryItemDto>> {
    return getAllLoginHistory(this.loginHistoryRepo, query);
  }

  getLoginHistoryDetail(id: string): Promise<HistoryDetailItemDto> {
    return getLoginHistoryDetail(this.loginHistoryRepo, id);
  }
}
