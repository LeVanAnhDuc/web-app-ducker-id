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

export interface RecentAppsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}
