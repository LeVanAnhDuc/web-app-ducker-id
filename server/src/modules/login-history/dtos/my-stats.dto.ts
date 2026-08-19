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

export interface MyLoginStatsDto {
  total: number;
  successful: number;
  failed: number;
  byMethod: Record<LoginMethod, number>;
  byDevice: Record<DeviceType, number>;
  range: {
    from: string;
    to: string;
  };
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

export const toMyLoginStatsDto = (
  aggregation: LoginStatsAggregationResult,
  range: { from: Date; to: Date }
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
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString()
    }
  };
};
