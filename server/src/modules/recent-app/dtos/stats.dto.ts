// types
import type { WebAppWithCategories } from "@/modules/web-app/types";
import type { PublicCategoryDto } from "@/modules/category/dtos";
import type { RecentAppUsage } from "../types";
// modules
import { toPublicCategoryDto } from "@/modules/category/dtos";
import { orderByCategoryIds } from "@/modules/web-app/helpers";
// constants
import { RECENT_APP_STATS } from "../constants";
// others
import { MILLISECONDS_PER_DAY } from "@/constants/time";

export interface TopAppDto {
  appId: string;
  displayName: string;
  iconUrl: string | null;
  homeUrl: string;
  /** The app's primary category (first of its ordered categories). */
  category: PublicCategoryDto | null;
  useCount: number;
  lastUsedAt: string;
}

export interface AppCategoryCountDto {
  /** Grouped by primary category; null for an app whose categories are gone. */
  category: PublicCategoryDto | null;
  count: number;
}

export interface RecentAppsStatsDto {
  totalApps: number;
  activeLast7Days: number;
  activeLast30Days: number;
  topApps: TopAppDto[];
  byCategory: AppCategoryCountDto[];
}

const primaryCategory = (
  app: WebAppWithCategories
): PublicCategoryDto | null => {
  const [first] = orderByCategoryIds(app);
  return first ? toPublicCategoryDto(first) : null;
};

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
  apps: WebAppWithCategories[],
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
          category: primaryCategory(app),
          useCount: usage.useCount,
          lastUsedAt: usage.lastUsedAt.toISOString()
        }
      ];
    });

  // Keyed by category id so two languages of one name never split a group.
  const counts = new Map<
    string | null,
    { category: PublicCategoryDto | null; count: number }
  >();
  usages.forEach((usage) => {
    const app = appById.get(usage.webAppId);
    if (!app) return;
    const category = primaryCategory(app);
    const key = category?._id ?? null;
    const entry = counts.get(key) ?? { category, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
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
    byCategory: [...counts.values()].sort((a, b) => b.count - a.count)
  };
};
