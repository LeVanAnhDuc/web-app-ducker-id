// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { RecentAppService } from "./services";
// common
import { ApiErrors, ApiProperty, Paginated } from "@/common/openapi";
import {
  Auth,
  PathVariable,
  RateLimit,
  RequestParam,
  Respond
} from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { RecentAppDto, RecentAppsStatsDto } from "./dtos";
import {
  ListRecentAppsQueryDto,
  RecentAppsStatsQueryDto
} from "./dtos/requests";

const APP_ID = [
  IsRequiredObjectId("recentApp:validation.appId.invalid"),
  ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the app"
  })
];

@JsonController("/users/me/recent-apps")
@Auth()
@OpenAPI({ tags: ["Recent Apps"] })
export class RecentAppController {
  constructor(private readonly service: RecentAppService) {}

  @Get("/")
  @OpenAPI({
    summary: "List recently used apps",
    description:
      "The apps the current user has opened, newest first, one row per app. Only apps the user can still see in the catalog are returned (active, and visible to the user's role); soft-deleted rows are excluded."
  })
  @Respond({ message: "recentApp:success.list", type: Paginated(RecentAppDto) })
  list(@RequestParam(ListRecentAppsQueryDto) query: ListRecentAppsQueryDto) {
    return this.service.list(query);
  }

  // Before "/:appId" so the literal segment is not read as an app id.
  @Get("/stats")
  @OpenAPI({
    summary: "Recent-app usage statistics",
    description:
      "Totals, how many apps were used in the last 7 and 30 days, the most opened apps (all-time use count) and the apps per primary category. Counts only apps the user can still see."
  })
  @Respond({ message: "recentApp:success.stats", type: RecentAppsStatsDto })
  stats(@RequestParam(RecentAppsStatsQueryDto) query: RecentAppsStatsQueryDto) {
    return this.service.stats(query);
  }

  @Delete("/")
  @OpenAPI({
    summary: "Clear recent history",
    description:
      "Soft-deletes every visible row for the current user. Rows are purged 30 days later; opening an app again brings it back with a fresh count."
  })
  @Respond({ status: StatusCodes.NO_CONTENT })
  async clear() {
    await this.service.hideAll();
  }

  @Post("/:appId")
  @OpenAPI({
    summary: "Record an app launch",
    description:
      "Called by the launcher when the user opens an app. Upserts the row: inserts it, revives a soft-deleted one with a count of 1, or bumps `lastUsedAt` and `useCount` (writes within 60 seconds count once). Rate-limited per user."
  })
  @ApiErrors(404)
  @RateLimit("recordRecentAppByUser")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async record(@PathVariable("appId", ...APP_ID) appId: string) {
    await this.service.recordLaunch(appId);
  }

  @Delete("/:appId")
  @OpenAPI({
    summary: "Remove an app from recent history",
    description:
      "Soft-deletes the row (idempotent). It can be brought back with the restore endpoint."
  })
  @Respond({ status: StatusCodes.NO_CONTENT })
  async hide(@PathVariable("appId", ...APP_ID) appId: string) {
    await this.service.hide(appId);
  }

  @Post("/:appId/restore")
  @OpenAPI({ summary: "Undo removing an app from recent history" })
  @Respond({ status: StatusCodes.NO_CONTENT })
  async restore(@PathVariable("appId", ...APP_ID) appId: string) {
    await this.service.restore(appId);
  }
}
