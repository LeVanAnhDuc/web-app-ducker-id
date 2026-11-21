// types
import type { Schema } from "mongoose";
import type { ClientInfo } from "@/utils/request-context";
import type { LoginMethod } from "../types";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
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
import { RequestContext } from "@/utils/request-context";
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
}

/**
 * Interactive sign-ins to Ducker ID itself. SSO hand-offs to satellite apps
 * go through `recordAppSignIn` and are never assessed: the user did not sign
 * in, a session they already had issued a code.
 *
 * Fire-and-forget like every `record*`: nothing here may fail the login.
 */
export const recordSuccessfulLogin = (
  deps: {
    loginHistoryRepo: LoginHistoryRepository;
    notificationDispatcher: NotificationDispatcher;
  },
  params: SuccessfulLoginParams
): void => {
  // Read now, while still inside the request that caused the sign-in.
  void recordAndAssess(deps, params, RequestContext.getClient());
};

const recordAndAssess = async (
  deps: {
    loginHistoryRepo: LoginHistoryRepository;
    notificationDispatcher: NotificationDispatcher;
  },
  { userId, usernameAttempted, loginMethod }: SuccessfulLoginParams,
  client: ClientInfo
): Promise<void> => {
  const authId = userId.toString();

  try {
    const data = buildLoginHistoryData({
      userId: authId,
      usernameAttempted,
      status: LOGIN_STATUSES.SUCCESS,
      loginMethod,
      client
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
