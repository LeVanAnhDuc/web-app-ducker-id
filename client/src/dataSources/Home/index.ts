// types
import type { LucideIcon } from "lucide-react";
import type { LoginHistoryStats } from "@/types/LoginHistory";
import type { RecentAppsStats } from "@/types/RecentlyUsed";
import type { HomeMessages, LeafKeyOf } from "@/types/libs";
// libs
import { CircleCheck, CircleX, Clock, LayoutGrid } from "lucide-react";
// others
import CONSTANTS from "@/constants";

const { ROUTES, LOGIN_HISTORY, LIST } = CONSTANTS;

export type StatTone = "primary" | "info" | "success" | "danger";

export interface HomeStatCardDef {
  key: LeafKeyOf<HomeMessages["stats"]>;
  icon: LucideIcon;
  tone: StatTone;
  value: number;
  /** Where the number can be inspected. Every card on Home has one. */
  href: string;
}

/**
 * A query string the Login History page can read back. Its filters live in the
 * URL, so a link is enough to open the list already filtered — nothing has to
 * be handed over through router state.
 */
const loginHistoryHref = (params: Record<string, string>): string => {
  const query = new URLSearchParams(params).toString();
  return query ? `${ROUTES.LOGIN_HISTORY}?${query}` : ROUTES.LOGIN_HISTORY;
};

export const loginHistoryByStatus = (status: string): string =>
  loginHistoryHref({ status });

export const loginHistoryByMethod = (method: string): string =>
  loginHistoryHref({ method });

export const loginHistoryByDevice = (deviceType: string): string =>
  loginHistoryHref({ deviceType });

/** One day of the activity chart, optionally narrowed to the failures in it. */
export const loginHistoryByDay = (day: string, status?: string): string =>
  loginHistoryHref({
    [LIST.PARAM.DATE_RANGE]: "custom",
    [LIST.PARAM.FROM_DATE]: day,
    [LIST.PARAM.TO_DATE]: day,
    ...(status ? { status } : {})
  });

/**
 * The four cards above the chart. Every value is read from an endpoint; a
 * metric with no source belongs in the backlog, not behind a placeholder.
 */
export const buildHomeStatCards = (
  appStats: RecentAppsStats | undefined,
  loginStats: LoginHistoryStats | undefined
): HomeStatCardDef[] => [
  {
    key: "totalApps",
    icon: LayoutGrid,
    tone: "primary",
    value: appStats?.totalApps ?? 0,
    href: ROUTES.RECENTLY_USED
  },
  {
    key: "activeApps",
    icon: Clock,
    tone: "info",
    value: appStats?.activeLast30Days ?? 0,
    href: ROUTES.RECENTLY_USED
  },
  {
    key: "successfulLogins",
    icon: CircleCheck,
    tone: "success",
    value: loginStats?.successful ?? 0,
    href: loginHistoryByStatus(LOGIN_HISTORY.STATUS.SUCCESS)
  },
  {
    key: "failedLogins",
    icon: CircleX,
    tone: "danger",
    value: loginStats?.failed ?? 0,
    href: loginHistoryByStatus(LOGIN_HISTORY.STATUS.FAILED)
  }
];

export const HOME_RANGE_OPTIONS = LOGIN_HISTORY.STATS_RANGE_VALUES;
