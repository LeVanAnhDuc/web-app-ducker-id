// types
import type { WebAppWithCategory } from "@/modules/web-app/types";
import type { RecentAppUsage } from "../types";
// constants
import { RECENT_APP_STATS } from "../constants";
// others
import { MILLISECONDS_PER_DAY } from "@/constants/time";

export interface TopAppDto {
  appId: string;
  displayName: string;
  iconUrl: string | null;
  homeUrl: string;
  category: string | null;
  useCount: number;
  lastUsedAt: string;
}

export interface AppCategoryCountDto {
  category: string | null;
  count: number;
}

export interface RecentAppsStatsDto {
  totalApps: number;
  activeLast7Days: number;
  activeLast30Days: number;
  topApps: TopAppDto[];
  byCategory: AppCategoryCountDto[];
}

const usedWithin = (
  usages: RecentAppUsage[],
  days: number,
  now: number
): number => {
  const since = now - days * MILLISECONDS_PER_DAY;
  return usages.filter((usage) => usage.lastUsedAt.getTime() >= since).length;
};

/**
 * `useCount` is a lifetime counter with no date attached, so the ranking it
 * produces is all-time and cannot be narrowed to a window. The two "active in
 * N days" numbers come from `lastUsedAt` instead and answer a different
 * question: how many apps are still in use, not how often.
 */
export const toRecentAppsStatsDto = (
  apps: WebAppWithCategory[],
  usages: RecentAppUsage[],
  limit: number,
  now: Date = new Date()
): RecentAppsStatsDto => {
  const appById = new Map(apps.map((app) => [app._id.toString(), app]));
  const nowMs = now.getTime();

  const topApps = [...usages]
    .sort(
      (a, b) =>
        b.useCount - a.useCount ||
        b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
    )
    .slice(0, limit)
    .flatMap((usage) => {
      const app = appById.get(usage.webAppId);
      if (!app) return [];
      return [
        {
          appId: usage.webAppId,
          displayName: app.displayName,
          iconUrl: app.iconUrl ?? null,
          homeUrl: app.homeUrl,
          category: app.category?.displayName ?? null,
          useCount: usage.useCount,
          lastUsedAt: usage.lastUsedAt.toISOString()
        }
      ];
    });

  const counts = new Map<string | null, number>();
  usages.forEach((usage) => {
    const app = appById.get(usage.webAppId);
    if (!app) return;
    const category = app.category?.displayName ?? null;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  return {
    totalApps: usages.length,
    activeLast7Days: usedWithin(
      usages,
      RECENT_APP_STATS.ACTIVE_WINDOW_DAYS.RECENT,
      nowMs
    ),
    activeLast30Days: usedWithin(
      usages,
      RECENT_APP_STATS.ACTIVE_WINDOW_DAYS.EXTENDED,
      nowMs
    ),
    topApps,
    byCategory: [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  };
};
