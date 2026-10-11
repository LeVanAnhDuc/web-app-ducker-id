// types
import type { PaginatedResult } from "@/common/pagination";
import type { Schema } from "mongoose";
import type { Request } from "express";
import type {
  LoginEventApp,
  LoginFailReason,
  LoginHistoryAdminQuery,
  LoginHistoryQuery,
  LoginMethod,
  LoginStatsQuery
} from "../types";
import type {
  AllHistoryItemDto,
  HistoryDetailItemDto,
  MyHistoryItemDto,
  MyLoginStatsDto
} from "../dtos";
import type { LoginHistoryServiceDeps } from "./deps";
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
  constructor(private readonly deps: LoginHistoryServiceDeps) {}

  recordSuccessfulLogin(params: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    req: Request;
  }): void {
    recordSuccessfulLogin(this.deps, params);
  }

  recordFailedLogin(params: {
    userId?: Schema.Types.ObjectId | string | null;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    failReason: LoginFailReason;
    req: Request;
  }): void {
    recordFailedLogin(this.deps, params);
  }

  recordAppSignIn(params: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    app: LoginEventApp;
    req: Request;
  }): void {
    recordAppSignIn(this.deps, params);
  }

  recordAppSignInDenied(params: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    app: LoginEventApp;
    req: Request;
  }): void {
    recordAppSignInDenied(this.deps, params);
  }

  getMyLoginHistory(
    query: LoginHistoryQuery
  ): Promise<PaginatedResult<MyHistoryItemDto>> {
    return getMyLoginHistory(this.deps, query);
  }

  getMyLoginStats(query: LoginStatsQuery): Promise<MyLoginStatsDto> {
    return getMyLoginStats(this.deps, query);
  }

  getAllLoginHistory(
    query: LoginHistoryAdminQuery
  ): Promise<PaginatedResult<AllHistoryItemDto>> {
    return getAllLoginHistory(this.deps, query);
  }

  getLoginHistoryDetail(id: string): Promise<HistoryDetailItemDto> {
    return getLoginHistoryDetail(this.deps, id);
  }
}
