// types
import type { Schema } from "mongoose";
import type { Request } from "express";
import type { LoginMethod } from "../types";
import type { LoginHistoryServiceDeps } from "./deps";
// modules
import {
  LOGIN_ANOMALY_CONFIG,
  LOGIN_ANOMALY_REASONS,
  LOGIN_STATUSES
} from "@/modules/login-history/constants";
import {
  LOGIN_ANOMALY_REASONS as NOTIFIED_REASONS,
  NOTIFICATION_LINKS,
  NOTIFICATION_TYPES
} from "@/modules/notification/constants";
// others
import { Logger } from "@/libs/logger";
import { MILLISECONDS_PER_DAY } from "@/constants/time";
import {
  assessLoginAnomaly,
  buildLoginHistoryData,
  stripVersion
} from "../helpers";

interface SuccessfulLoginParams {
  userId: Schema.Types.ObjectId | string;
  usernameAttempted: string;
  loginMethod: LoginMethod;
  req: Request;
}

/**
 * Interactive sign-ins to Ducker ID itself. SSO hand-offs to satellite apps
 * go through `recordAppSignIn` and are never assessed: the user did not sign
 * in, a session they already had issued a code.
 *
 * Fire-and-forget like every `record*`: nothing here may fail the login.
 */
export const recordSuccessfulLogin = (
  deps: LoginHistoryServiceDeps,
  params: SuccessfulLoginParams
): void => {
  void recordAndAssess(deps, params);
};

const recordAndAssess = async (
  deps: LoginHistoryServiceDeps,
  { userId, usernameAttempted, loginMethod, req }: SuccessfulLoginParams
): Promise<void> => {
  const authId = userId.toString();

  try {
    const data = buildLoginHistoryData({
      userId: authId,
      usernameAttempted,
      status: LOGIN_STATUSES.SUCCESS,
      loginMethod,
      req
    });

    // Read the history before writing this sign-in, or it would always find
    // its own device.
    const since = new Date(
      Date.now() - LOGIN_ANOMALY_CONFIG.LOOKBACK_DAYS * MILLISECONDS_PER_DAY
    );
    const traits = await deps.loginHistoryRepo.findSignInTraits(authId, since);
    const { isAnomaly, reasons } = assessLoginAnomaly(data, traits);

    await deps.loginHistoryRepo.create({
      ...data,
      isAnomaly,
      anomalyReasons: reasons
    });

    Logger.info("Login history logged successfully", {
      userId: authId,
      usernameAttempted,
      status: LOGIN_STATUSES.SUCCESS,
      loginMethod,
      isAnomaly
    });

    if (!isAnomaly) return;

    const newDevice = reasons.includes(LOGIN_ANOMALY_REASONS.NEW_DEVICE);
    const newCountry = reasons.includes(LOGIN_ANOMALY_REASONS.NEW_COUNTRY);

    deps.notificationDispatcher.notifyByAuthId({
      authId,
      type: NOTIFICATION_TYPES.LOGIN_ANOMALY,
      params: {
        reason:
          newDevice && newCountry
            ? NOTIFIED_REASONS.BOTH
            : newDevice
              ? NOTIFIED_REASONS.DEVICE
              : NOTIFIED_REASONS.COUNTRY,
        browser: stripVersion(data.browser),
        os: stripVersion(data.os),
        country: data.country
      },
      link: NOTIFICATION_LINKS.LOGIN_HISTORY
    });
  } catch (error) {
    Logger.error("Failed to log login history", {
      error,
      payload: {
        userId: authId,
        usernameAttempted,
        status: LOGIN_STATUSES.SUCCESS,
        loginMethod
      }
    });
  }
};
