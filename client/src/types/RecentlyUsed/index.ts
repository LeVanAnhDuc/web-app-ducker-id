// types
import type { UserApp } from "@/types/Apps";
// others
import type RECENT_GROUP from "@/constants/recentGroup";

export type RecentGroupKey = (typeof RECENT_GROUP)[keyof typeof RECENT_GROUP];

export interface RecentApp extends UserApp {
  lastUsedAt: string;
  useCount: number;
}

export type RecentAppsResponse = Paginated<RecentApp>;

export interface TopApp {
  appId: string;
  displayName: string;
  iconUrl: string | null;
  homeUrl: string;
  category: string | null;
  useCount: number;
  lastUsedAt: string;
}

export interface AppCategoryCount {
  category: string | null;
  count: number;
}

export interface RecentAppsStats {
  totalApps: number;
  activeLast7Days: number;
  activeLast30Days: number;
  topApps: TopApp[];
  byCategory: AppCategoryCount[];
}

export interface RecentAppsStatsQueryParams {
  limit?: number;
}

export interface RecentAppsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}
