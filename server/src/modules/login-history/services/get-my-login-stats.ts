// types
import type { MyLoginStatsDto } from "../dtos";
import type { LoginStatsQuery } from "@/modules/login-history/types";
import type { LoginHistoryServiceDeps } from "./deps";
// modules
import { LOGIN_HISTORY_STATS } from "@/modules/login-history/constants";
// dtos
import { toMyLoginStatsDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { addDays, startOfZonedDay, toZonedDay } from "@/utils/date/zoned-day";

const RANGE_DAYS: readonly number[] = LOGIN_HISTORY_STATS.RANGE_DAYS;

/**
 * `range` arrives as `7d` / `30d` / `90d` and `tz` as an IANA zone, both
 * already checked by Joi. They are re-checked here because the service is also
 * reachable without the route — an unknown value falls back rather than
 * reaching `$dateToString`.
 */
const resolveOptions = (
  query: LoginStatsQuery
): { days: number; timezone: string } => {
  const requested = Number.parseInt(query.range ?? "", 10);
  return {
    days: RANGE_DAYS.includes(requested)
      ? requested
      : LOGIN_HISTORY_STATS.DEFAULT_RANGE_DAYS,
    timezone: query.tz ?? LOGIN_HISTORY_STATS.DEFAULT_TIMEZONE
  };
};

export const getMyLoginStats = async (
  deps: LoginHistoryServiceDeps,
  query: LoginStatsQuery = {}
): Promise<MyLoginStatsDto> => {
  const userId = RequestContext.requireAuthId();
  const { days, timezone } = resolveOptions(query);

  // The window starts at local midnight, not at "now minus N × 24h": a range
  // ending mid-afternoon would otherwise cut its own first day in half and
  // report a short bar for a day that was in fact busy.
  const to = new Date();
  const from = startOfZonedDay(
    addDays(toZonedDay(to, timezone), -(days - 1)),
    timezone
  );

  const aggregation = await deps.loginHistoryRepo.aggregateMyStats({
    userId,
    from,
    to,
    timezone,
    topAppsLimit: LOGIN_HISTORY_STATS.TOP_APPS_LIMIT
  });

  return toMyLoginStatsDto(aggregation, { from, to, days, timezone });
};
