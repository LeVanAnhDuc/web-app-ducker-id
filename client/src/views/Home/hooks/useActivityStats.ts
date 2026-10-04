"use client";

// libs
import { useQuery, keepPreviousData } from "@tanstack/react-query";
// types
import type { LoginStatsRange } from "@/types/LoginHistory";
// hooks
import { useBrowserTimeZone, useSearchParamState } from "@/hooks";
// requests
import { getMyLoginHistoryStats } from "@/requests/loginHistory";
import { getRecentAppsStats } from "@/requests/recentApps";
// others
import CONSTANTS from "@/constants";

const { QUERY_KEYS, LOGIN_HISTORY } = CONSTANTS;
const RANGE_PARAM = "range";

const isRange = (value: string): value is LoginStatsRange =>
  (LOGIN_HISTORY.STATS_RANGE_VALUES as string[]).includes(value);

/**
 * The selected range lives in the URL so a view of the chart can be shared or
 * reloaded, exactly as list pages treat their filters.
 */
export const useActivityRange = (): [
  LoginStatsRange,
  (next: LoginStatsRange) => void
] => {
  const [raw, setRaw] = useSearchParamState(
    RANGE_PARAM,
    LOGIN_HISTORY.STATS_RANGE.WEEK
  );
  return [isRange(raw) ? raw : LOGIN_HISTORY.STATS_RANGE.WEEK, setRaw];
};

/**
 * Day buckets are cut server-side, so the query waits for the browser's zone
 * rather than asking in UTC and re-cutting a moment later. `keepPreviousData`
 * holds the old bars while a new range loads — rebuilding the chart from empty
 * on every toggle is the most visible way to make it feel broken.
 */
export const useLoginStats = (range: LoginStatsRange) => {
  const timeZone = useBrowserTimeZone();

  return useQuery({
    queryKey: [QUERY_KEYS.LOGIN_HISTORY, "stats", range, timeZone],
    queryFn: () => getMyLoginHistoryStats({ range, tz: timeZone }),
    enabled: Boolean(timeZone),
    placeholderData: keepPreviousData
  });
};

export const useRecentAppsStats = () =>
  useQuery({
    queryKey: [QUERY_KEYS.RECENT_APPS_STATS],
    queryFn: () => getRecentAppsStats()
  });
