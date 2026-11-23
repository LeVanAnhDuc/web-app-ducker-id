// types
import type { PaginatedResult } from "@/common/pagination";
import type { Schema } from "mongoose";
import type { LoginEventApp, LoginFailReason, LoginMethod } from "../types";
import type {
  LoginHistoryAdminQueryDto,
  LoginHistoryQueryDto,
  LoginHistoryStatsQueryDto
} from "../dtos/requests";
import type { MyLoginStatsDto } from "../dtos";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
import { NotFoundError } from "@/exceptions";
// modules
import {
  LOGIN_STATUSES,
  LOGIN_METHODS,
  LOGIN_FAIL_REASONS
} from "@/modules/login-history/constants";
// dtos
import {
  AllHistoryItemDto,
  HistoryDetailItemDto,
  MyHistoryItemDto
} from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";
import { buildLoginHistoryFilter } from "../helpers";
import { getMyLoginStats } from "./get-my-login-stats";
import { recordSuccessfulLogin } from "./record-successful-login";
import { logLoginAttempt } from "./shared/log-login-attempt";

export class LoginHistoryService {
  constructor(
    private readonly loginHistoryRepo: LoginHistoryRepository,
    private readonly notificationDispatcher: NotificationDispatcher
  ) {}

  recordSuccessfulLogin(params: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    loginMethod: LoginMethod;
  }): void {
    recordSuccessfulLogin(
      {
        loginHistoryRepo: this.loginHistoryRepo,
        notificationDispatcher: this.notificationDispatcher
      },
      params
    );
  }

  recordFailedLogin({
    userId,
    usernameAttempted,
    loginMethod,
    failReason
  }: {
    userId?: Schema.Types.ObjectId | string | null;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    failReason: LoginFailReason;
  }): void {
    void logLoginAttempt(this.loginHistoryRepo, {
      userId: userId ? userId.toString() : null,
      usernameAttempted,
      status: LOGIN_STATUSES.FAILED,
      failReason,
      loginMethod,
      client: RequestContext.getClient()
    });
  }

  /**
   * The IdP handed an authorization code to a satellite app. `interactive`
   * says whether the user had just logged in for it or the code came silently
   * from an existing session.
   */
  recordAppSignIn({
    userId,
    usernameAttempted,
    app
  }: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    app: LoginEventApp;
  }): void {
    void logLoginAttempt(this.loginHistoryRepo, {
      userId: userId.toString(),
      usernameAttempted,
      status: LOGIN_STATUSES.SUCCESS,
      loginMethod: LOGIN_METHODS.SSO,
      app,
      client: RequestContext.getClient()
    });
  }

  recordAppSignInDenied({
    userId,
    usernameAttempted,
    app
  }: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    app: LoginEventApp;
  }): void {
    void logLoginAttempt(this.loginHistoryRepo, {
      userId: userId.toString(),
      usernameAttempted,
      status: LOGIN_STATUSES.FAILED,
      failReason: LOGIN_FAIL_REASONS.NOT_ENTITLED,
      loginMethod: LOGIN_METHODS.SSO,
      app,
      client: RequestContext.getClient()
    });
  }

  async getMyLoginHistory(
    query: LoginHistoryQueryDto
  ): Promise<PaginatedResult<MyHistoryItemDto>> {
    const userId = RequestContext.requireAuthId();
    const { page, limit, skip, sort } = resolvePaging(query);

    const filter = buildLoginHistoryFilter(
      query as LoginHistoryAdminQueryDto,
      userId
    );
    const { data, total } = await this.loginHistoryRepo.findByUser(filter, {
      skip,
      limit,
      sort
    });

    return {
      items: toDto(MyHistoryItemDto, data),
      meta: toPageMeta(total, page, limit)
    };
  }

  getMyLoginStats(query: LoginHistoryStatsQueryDto): Promise<MyLoginStatsDto> {
    return getMyLoginStats(this.loginHistoryRepo, query);
  }

  async getAllLoginHistory(
    query: LoginHistoryAdminQueryDto
  ): Promise<PaginatedResult<AllHistoryItemDto>> {
    const { page, limit, skip, sort } = resolvePaging(query);

    const filter = buildLoginHistoryFilter(query);
    const { data, total } = await this.loginHistoryRepo.findAll(filter, {
      skip,
      limit,
      sort
    });

    return {
      items: toDto(AllHistoryItemDto, data),
      meta: toPageMeta(total, page, limit)
    };
  }

  async getLoginHistoryDetail(id: string): Promise<HistoryDetailItemDto> {
    const doc = await this.loginHistoryRepo.findById(id);

    if (!doc) {
      throw new NotFoundError({
        key: "loginHistory:errors.notFound",
        code: ERROR_CODES.LOGIN_HISTORY_NOT_FOUND
      });
    }

    return toDto(HistoryDetailItemDto, doc);
  }
}
