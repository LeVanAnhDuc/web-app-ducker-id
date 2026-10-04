// types
import type { RecentGroupKey } from "@/types/RecentlyUsed";
// others
import CONSTANTS from "@/constants";

const { TODAY, YESTERDAY, THIS_WEEK, EARLIER } = CONSTANTS.RECENT_GROUP;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

/** Buckets by the viewer's local calendar day, so it must run on the client. */
export const recentGroupOf = (iso: string, now: number): RecentGroupKey => {
  const startToday = new Date(now).setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  if (t >= startToday) return TODAY;
  if (t >= startToday - DAY_MS) return YESTERDAY;
  if (t >= startToday - (WEEK_DAYS - 1) * DAY_MS) return THIS_WEEK;
  return EARLIER;
};

export const RECENT_GROUP_ORDER: RecentGroupKey[] = [
  TODAY,
  YESTERDAY,
  THIS_WEEK,
  EARLIER
];

export const groupRecentApps = <T extends { lastUsedAt: string }>(
  items: T[],
  now: number
): { key: RecentGroupKey; apps: T[] }[] => {
  const byGroup = new Map<RecentGroupKey, T[]>();
  items.forEach((item) => {
    const key = recentGroupOf(item.lastUsedAt, now);
    byGroup.set(key, [...(byGroup.get(key) ?? []), item]);
  });
  return RECENT_GROUP_ORDER.flatMap((key) => {
    const apps = byGroup.get(key);
    return apps ? [{ key, apps }] : [];
  });
};
