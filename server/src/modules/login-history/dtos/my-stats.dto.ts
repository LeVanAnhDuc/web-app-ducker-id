// types
import type {
  DeviceType,
  LoginMethod,
  LoginStatsAggregationResult
} from "@/modules/login-history/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import {
  DEVICE_TYPES,
  LOGIN_METHODS,
  LOGIN_STATUSES
} from "@/modules/login-history/constants";
// others
import { addDays, toZonedDay } from "@/utils/date/zoned-day";

// A count per key, as a `Record` literal: reflection cannot see inside it.
const countsSchema = (keys: string[], description: string) => () => ({
  type: "object" as const,
  description,
  properties: Object.fromEntries(
    keys.map((key) => [key, { type: "integer" as const }])
  )
});

/** Plain data: `toMyLoginStatsDto` builds object literals typed as these classes. */
export class LoginStatsDayDto {
  /** Local calendar day, `YYYY-MM-DD`. */
  @ApiProperty({
    type: "string",
    example: "2026-10-15",
    description: "Local calendar day, `YYYY-MM-DD`"
  })
  date!: string;

  @ApiProperty({ type: "integer", example: 3 })
  total!: number;

  @ApiProperty({ type: "integer", example: 2 })
  successful!: number;

  @ApiProperty({ type: "integer", example: 1 })
  failed!: number;
}

export class LoginStatsAppDto {
  @ApiProperty({ type: "string", example: "507f1f77bcf86cd799439011" })
  webAppId!: string;

  @ApiProperty({ type: "string", nullable: true, example: "Satellite Monitor" })
  clientName!: string | null;

  @ApiProperty({ type: "integer", example: 4 })
  count!: number;
}

export class LoginStatsRangeDto {
  @ApiProperty({
    type: "string",
    format: "date-time",
    example: "2026-10-09T00:00:00.000Z"
  })
  from!: string;

  @ApiProperty({
    type: "string",
    format: "date-time",
    example: "2026-10-15T23:59:59.999Z"
  })
  to!: string;

  @ApiProperty({ type: "integer", example: 7 })
  days!: number;

  @ApiProperty({ type: "string", example: "Asia/Ho_Chi_Minh" })
  timezone!: string;
}

export class MyLoginStatsDto {
  @ApiProperty({ type: "integer", example: 12 })
  total!: number;

  @ApiProperty({ type: "integer", example: 10 })
  successful!: number;

  @ApiProperty({ type: "integer", example: 2 })
  failed!: number;

  @ApiProperty(
    countsSchema(Object.values(LOGIN_METHODS), "Sign-ins per login method")
  )
  byMethod!: Record<LoginMethod, number>;

  @ApiProperty(
    countsSchema(Object.values(DEVICE_TYPES), "Sign-ins per device type")
  )
  byDevice!: Record<DeviceType, number>;

  @ApiProperty({
    type: [LoginStatsDayDto],
    description: "Every day in the range, in order, zero-filled"
  })
  byDay!: LoginStatsDayDto[];

  @ApiProperty({ type: [LoginStatsAppDto] })
  byApp!: LoginStatsAppDto[];

  @ApiProperty({ type: "integer", example: 1 })
  anomalies!: number;

  @ApiProperty({ type: LoginStatsRangeDto })
  range!: LoginStatsRangeDto;
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
