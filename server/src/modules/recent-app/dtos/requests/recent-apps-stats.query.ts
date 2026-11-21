// libs
import { IsInt, IsOptional, Max, Min } from "class-validator";
// modules
import { RECENT_APP_STATS } from "@/modules/recent-app/constants";
// validators
import { ToInt } from "@/validators/decorators";

// `limit` caps the top-apps list, not a page, so its ceiling is the stats one.
export class RecentAppsStatsQueryDto {
  @Max(RECENT_APP_STATS.TOP_APPS_MAX_LIMIT, {
    message: "validation:limit.invalid"
  })
  @Min(1, { message: "validation:limit.invalid" })
  @IsInt({ message: "validation:limit.invalid" })
  @IsOptional()
  @ToInt()
  limit?: number;
}
