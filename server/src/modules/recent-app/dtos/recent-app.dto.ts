// types
import type { WebAppWithCategories } from "@/modules/web-app/types";
import type { RecentAppUsage } from "../types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { toUserAppDto, UserAppDto } from "@/modules/web-app/dtos";

/** The launcher card plus the caller's usage. Plain data: `toRecentAppDto` returns an object literal typed as it. */
export class RecentAppDto extends UserAppDto {
  @ApiProperty({
    type: "string",
    format: "date-time",
    example: "2026-10-04T08:30:00.000Z",
    description: "When the user last opened the app"
  })
  lastUsedAt!: string;

  @ApiProperty({
    type: "integer",
    example: 4,
    description:
      "Opens since the row was created or last revived; writes inside the 60s dedupe window count once"
  })
  useCount!: number;
}

export const toRecentAppDto = (
  doc: WebAppWithCategories,
  usage: RecentAppUsage,
  isFavorite: boolean
): RecentAppDto => ({
  ...toUserAppDto(doc, isFavorite),
  lastUsedAt: usage.lastUsedAt.toISOString(),
  useCount: usage.useCount
});
