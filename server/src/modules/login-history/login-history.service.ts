// types
import type { Schema } from "mongoose";
import type { Request } from "express";
import type { LoginHistoryRepository } from "./login-history.repository";
import type {
  LoginEventPayload,
  ClientType,
  LoginHistoryQuery,
  LoginHistoryAdminQuery,
  PaginatedResult,
  LoginMethod,
  LoginFailReason
} from "@/modules/login-history/types";
import type {
  MyHistoryItemDto,
  AllHistoryItemDto,
  MyLoginStatsDto,
  HistoryDetailItemDto
} from "./dtos";
// modules
import {
  LOGIN_STATUSES,
  HTTP_HEADERS,
  LOGIN_HISTORY_STATS
} from "@/modules/login-history/constants";
// dtos
import {
  toMyHistoryItemDto,
  toAllHistoryItemDto,
  toMyLoginStatsDto,
  toHistoryDetailItemDto
} from "./dtos";
// common
import { NotFoundError } from "@/common/exceptions";
import { PAGINATION } from "@/common/pagination";
import { resolveSortDirection } from "@/common/sort";
// constants
import { ERROR_CODES } from "@/constants/error-code";
// others
import { Logger } from "@/libs/logger";
import { RequestContext } from "@/utils/request-context";
import { MILLISECONDS_PER_DAY } from "@/constants/time";
// helpers
import {
  extractIp,
  parseUserAgent,
  geoipLookup,
  determineClientType,
  buildLoginHistoryFilter
} from "./helpers";

export class LoginHistoryService {
  constructor(private readonly loginHistoryRepo: LoginHistoryRepository) {}

  recordSuccessfulLogin({
    userId,
    usernameAttempted,
    loginMethod,
    req
  }: {
    userId: Schema.Types.ObjectId | string;
    usernameAttempted: string;
    loginMethod: LoginMethod;
    req: Request;
  }): void {
    this.logLoginAttempt({
      userId: userId.toString(),
      usernameAttempted,
      status: LOGIN_STATUSES.SUCCESS,
      loginMethod,
      req
    });
  }

  recordFailedLogin({
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
  }): void {
    this.logLoginAttempt({
      userId: userId ? userId.toString() : null,
      usernameAttempted,
      status: LOGIN_STATUSES.FAILED,
      failReason,
      loginMethod,
      req
    });
  }

  async getMyLoginHistory(
    query: LoginHistoryQuery
  ): Promise<PaginatedResult<MyHistoryItemDto>> {
    const userId = RequestContext.requireAuthId();
    const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
    const {
      page = DEFAULT_PAGE,
      limit: rawLimit = DEFAULT_LIMIT,
      sortBy = "createdAt",
      sortOrder: rawSortOrder
    } = query;
    const limit = Math.min(rawLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const sortOrder = resolveSortDirection(rawSortOrder);

    const filter = buildLoginHistoryFilter(
      query as LoginHistoryAdminQuery,
      userId
    );
    const { data, total } = await this.loginHistoryRepo.findByUser(filter, {
      skip,
      limit,
      sort: { [sortBy]: sortOrder }
    });

    return {
      items: data.map(toMyHistoryItemDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getMyLoginStats(): Promise<MyLoginStatsDto> {
    const userId = RequestContext.requireAuthId();
    const to = new Date();
    const from = new Date(
      to.getTime() -
        LOGIN_HISTORY_STATS.DEFAULT_RANGE_DAYS * MILLISECONDS_PER_DAY
    );

    const aggregation = await this.loginHistoryRepo.aggregateMyStats({
      userId,
      from,
      to
    });

    return toMyLoginStatsDto(aggregation, { from, to });
  }

  async getAllLoginHistory(
    query: LoginHistoryAdminQuery
  ): Promise<PaginatedResult<AllHistoryItemDto>> {
    const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
    const {
      page = DEFAULT_PAGE,
      limit: rawLimit = DEFAULT_LIMIT,
      sortBy = "createdAt",
      sortOrder: rawSortOrder
    } = query;
    const limit = Math.min(rawLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const sortOrder = resolveSortDirection(rawSortOrder);

    const filter = buildLoginHistoryFilter(query);
    const { data, total } = await this.loginHistoryRepo.findAll(filter, {
      skip,
      limit,
      sort: { [sortBy]: sortOrder }
    });

    return {
      items: data.map(toAllHistoryItemDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getLoginHistoryDetail(id: string): Promise<HistoryDetailItemDto> {
    const doc = await this.loginHistoryRepo.findById(id);

    if (!doc) {
      throw new NotFoundError({
        i18nMessage: (t) => t("loginHistory:errors.notFound"),
        code: ERROR_CODES.LOGIN_HISTORY_NOT_FOUND
      });
    }

    return toHistoryDetailItemDto(doc);
  }

  private async logLoginAttempt(payload: LoginEventPayload): Promise<void> {
    try {
      const {
        userId,
        usernameAttempted,
        status,
        failReason,
        loginMethod,
        req,
        timezoneOffset
      } = payload;

      const ip = extractIp(req);
      const userAgent = req.headers[HTTP_HEADERS.USER_AGENT] || "";
      const clientTypeHeader = req.headers[HTTP_HEADERS.CLIENT_TYPE] as
        | string
        | undefined;

      const clientType: ClientType = determineClientType(clientTypeHeader);

      const { deviceType, os, browser } = parseUserAgent(userAgent);

      const { country, city } = geoipLookup(ip);

      const loginHistoryData = {
        userId,
        usernameAttempted,
        method: loginMethod,
        status,
        failReason,
        ip,
        country,
        city,
        deviceType,
        os,
        browser,
        userAgent,
        clientType,
        timezoneOffset: timezoneOffset || null,
        isAnomaly: false,
        anomalyReasons: []
      };

      await this.loginHistoryRepo.create(loginHistoryData);

      Logger.info("Login history logged successfully", {
        userId,
        usernameAttempted,
        status,
        loginMethod
      });
    } catch (error) {
      Logger.error("Failed to log login history", {
        error,
        payload: {
          userId: payload.userId,
          usernameAttempted: payload.usernameAttempted,
          status: payload.status,
          loginMethod: payload.loginMethod
        }
      });
    }
  }
}
