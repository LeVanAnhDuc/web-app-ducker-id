// types
import type {
  DeviceType,
  LoginMethod,
  LoginStatsAggregationResult
} from "@/modules/login-history/types";
// modules
import {
  DEVICE_TYPES,
  LOGIN_METHODS,
  LOGIN_STATUSES
} from "@/modules/login-history/constants";
// others
import { addDays, toZonedDay } from "@/utils/date/zoned-day";

export interface LoginStatsDayDto {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  total: number;
  successful: number;
  failed: number;
}

export interface LoginStatsAppDto {
  webAppId: string;
  clientName: string | null;
  count: number;
}

export interface MyLoginStatsDto {
  total: number;
  successful: number;
  failed: number;
  byMethod: Record<LoginMethod, number>;
  byDevice: Record<DeviceType, number>;
  byDay: LoginStatsDayDto[];
  byApp: LoginStatsAppDto[];
  anomalies: number;
  range: {
    from: string;
    to: string;
    days: number;
    timezone: string;
  };
}

export interface LoginStatsDtoRange {
  from: Date;
  to: Date;
  days: number;
  timezone: string;
}

const zeroByMethod = (): Record<LoginMethod, number> =>
  Object.values(LOGIN_METHODS).reduce(
    (acc, method) => {
      acc[method] = 0;
      return acc;
    },
    {} as Record<LoginMethod, number>
  );

const zeroByDevice = (): Record<DeviceType, number> =>
  Object.values(DEVICE_TYPES).reduce(
    (acc, device) => {
      acc[device] = 0;
      return acc;
    },
    {} as Record<DeviceType, number>
  );

/**
 * Every day in the range, in order, zero-filled. A day with no sign-in still
 * gets a column: a chart that silently drops it misreads as a shorter week.
 */
const buildDaySeries = (
  buckets: LoginStatsAggregationResult["byDay"],
  range: LoginStatsDtoRange
): LoginStatsDayDto[] => {
  const byDay = new Map(buckets.map((bucket) => [bucket._id, bucket]));
  const lastDay = toZonedDay(range.to, range.timezone);

  const series: LoginStatsDayDto[] = [];
  let day = toZonedDay(range.from, range.timezone);

  // The range is validated against a fixed list, so the walk is bounded; the
  // guard only stops a malformed range from spinning.
  for (let step = 0; step <= range.days + 1; step += 1) {
    const bucket = byDay.get(day);
    series.push({
      date: day,
      total: bucket?.total ?? 0,
      successful: bucket?.successful ?? 0,
      failed: bucket?.failed ?? 0
    });
    if (day === lastDay) break;
    day = addDays(day, 1);
  }

  return series;
};

export const toMyLoginStatsDto = (
  aggregation: LoginStatsAggregationResult,
  range: LoginStatsDtoRange
): MyLoginStatsDto => {
  const total = aggregation.total[0]?.count ?? 0;

  const successful =
    aggregation.byStatus.find((b) => b._id === LOGIN_STATUSES.SUCCESS)?.count ??
    0;
  const failed =
    aggregation.byStatus.find((b) => b._id === LOGIN_STATUSES.FAILED)?.count ??
    0;

  const byMethod = zeroByMethod();
  aggregation.byMethod.forEach((b) => {
    byMethod[b._id] = b.count;
  });

  const byDevice = zeroByDevice();
  aggregation.byDevice.forEach((b) => {
    byDevice[b._id] = b.count;
  });

  return {
    total,
    successful,
    failed,
    byMethod,
    byDevice,
    byDay: buildDaySeries(aggregation.byDay, range),
    byApp: aggregation.byApp.map((b) => ({
      webAppId: String(b._id.webAppId),
      clientName: b._id.clientName ?? null,
      count: b.count
    })),
    anomalies: aggregation.anomalies[0]?.count ?? 0,
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days: range.days,
      timezone: range.timezone
    }
  };
};
