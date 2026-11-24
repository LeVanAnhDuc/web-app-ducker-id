// types
import type { WebAppWithCategories } from "@/modules/web-app/types";
import type { RecentAppUsage } from "../types";
// common
import { toDto } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// modules
import { PublicCategoryDto } from "@/modules/category/dtos";
import { orderByCategoryIds } from "@/modules/web-app/helpers";
// constants
import { RECENT_APP_STATS } from "../constants";
// others
import { MILLISECONDS_PER_DAY } from "@/constants/time";

/** Plain data: `toRecentAppsStatsDto` builds object literals typed as these classes. */
export class TopAppDto {
  @ApiProperty({ type: "string", example: "507f1f77bcf86cd799439011" })
  appId!: string;

  @ApiProperty({ type: "string", example: "Satellite Monitor" })
  displayName!: string;

  @ApiProperty({
    type: "string",
    nullable: true,
    example: "https://cdn.example.com/icons/monitor.png"
  })
  iconUrl!: string | null;

  @ApiProperty({ type: "string", example: "https://monitor.example.com" })
  homeUrl!: string;

  /** The app's primary category (first of its ordered categories). */
  @ApiProperty({
    type: PublicCategoryDto,
    nullable: true,
    description: "The app's primary category (first of its ordered categories)"
  })
  category!: PublicCategoryDto | null;

  @ApiProperty({ type: "integer", example: 12 })
  useCount!: number;

  @ApiProperty({
    type: "string",
    format: "date-time",
    example: "2026-10-04T08:30:00.000Z"
  })
  lastUsedAt!: string;
}

export class AppCategoryCountDto {
  /** Grouped by primary category; null for an app whose categories are gone. */
  @ApiProperty({
    type: PublicCategoryDto,
    nullable: true,
    description:
      "Grouped by primary category; null for an app whose categories are gone"
  })
  category!: PublicCategoryDto | null;

  @ApiProperty({ type: "integer", example: 3 })
  count!: number;
}

export class RecentAppsStatsDto {
  @ApiProperty({ type: "integer", example: 8 })
  totalApps!: number;

  @ApiProperty({
    type: "integer",
    example: 5,
    description: "Apps last used within 7 days"
  })
  activeLast7Days!: number;

  @ApiProperty({
    type: "integer",
    example: 7,
    description: "Apps last used within 30 days"
  })
  activeLast30Days!: number;

  @ApiProperty({
    type: [TopAppDto],
    description: "Most opened apps, all-time use count"
  })
  topApps!: TopAppDto[];

  @ApiProperty({ type: [AppCategoryCountDto] })
  byCategory!: AppCategoryCountDto[];
}

const primaryCategory = (
  app: WebAppWithCategories
): PublicCategoryDto | null => {
  const [first] = orderByCategoryIds(app);
  return first ? toDto(PublicCategoryDto, first) : null;
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
