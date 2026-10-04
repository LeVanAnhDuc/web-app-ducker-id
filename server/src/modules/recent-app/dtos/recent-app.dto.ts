// types
import type { WebAppWithCategories } from "@/modules/web-app/types";
import type { RecentAppDto, RecentAppUsage } from "../types";
// modules
import { toUserAppDto } from "@/modules/web-app/dtos";

export const toRecentAppDto = (
  doc: WebAppWithCategories,
  usage: RecentAppUsage,
  isFavorite: boolean
): RecentAppDto => ({
  ...toUserAppDto(doc, isFavorite),
  lastUsedAt: usage.lastUsedAt.toISOString(),
  useCount: usage.useCount
});
