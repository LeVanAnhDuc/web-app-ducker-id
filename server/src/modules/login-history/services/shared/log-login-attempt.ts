// types
import type { ClientType, LoginEventPayload } from "../../types";
import type { LoginHistoryRepository } from "../../repository/login-history.repository";
// modules
import { LOGIN_SOURCES, HTTP_HEADERS } from "@/modules/login-history/constants";
// others
import { Logger } from "@/libs/logger";
import {
  extractIp,
  parseUserAgent,
  geoipLookup,
  determineClientType
} from "../../helpers";

/**
 * Bốn method `record*` đều đổ về đây. Chạm Mongo nên không phải helper, và
 * dùng chung bởi nhiều method nên nằm ở `shared/` thay vì trong một file
 * method cụ thể.
 *
 * Không bao giờ throw: ghi lịch sử hỏng không được làm hỏng lần đăng nhập.
 */
export const logLoginAttempt = async (
  loginHistoryRepo: LoginHistoryRepository,
  payload: LoginEventPayload
): Promise<void> => {
  try {
    const {
      userId,
      usernameAttempted,
      status,
      failReason,
      loginMethod,
      req,
      timezoneOffset,
      app
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
      anomalyReasons: [],
      source: app ? LOGIN_SOURCES.OAUTH : LOGIN_SOURCES.IDP,
      webAppId: app?.webAppId ?? null,
      clientName: app?.clientName ?? null,
      interactive: app?.interactive ?? true
    };

    await loginHistoryRepo.create(loginHistoryData);

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
};
