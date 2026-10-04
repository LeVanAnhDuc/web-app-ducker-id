// types
import type { PaginationOptions } from "@/types/common";
import type { RecentAppUsage } from "../types";

export interface RecentAppRepository {
  record(
    userId: string,
    webAppId: string,
    now: Date,
    dedupeWindowMs: number
  ): Promise<void>;
  findVisibleWebAppIds(userId: string): Promise<string[]>;
  findPage(
    userId: string,
    webAppIds: string[],
    options: PaginationOptions
  ): Promise<{ data: RecentAppUsage[]; total: number }>;
  hide(userId: string, webAppId: string, now: Date): Promise<void>;
  hideAll(userId: string, now: Date): Promise<void>;
  restore(userId: string, webAppId: string): Promise<void>;
}
