// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post } from "routing-controllers";
// types
import type { RecentAppService } from "./services";
// common
import {
  Auth,
  RateLimit,
  Respond,
  ValidParams,
  ValidQuery
} from "@/common/routing";
// others
import {
  ListRecentAppsQueryDto,
  RecentAppIdParamsDto,
  RecentAppsStatsQueryDto
} from "./dtos/requests";

@JsonController("/users/me/recent-apps")
@Auth()
export class RecentAppController {
  constructor(private readonly service: RecentAppService) {}

  @Get("/")
  @Respond({ message: "recentApp:success.list" })
  list(@ValidQuery(ListRecentAppsQueryDto) query: ListRecentAppsQueryDto) {
    return this.service.list(query);
  }

  // Before "/:appId" so the literal segment is not read as an app id.
  @Get("/stats")
  @Respond({ message: "recentApp:success.stats" })
  stats(@ValidQuery(RecentAppsStatsQueryDto) query: RecentAppsStatsQueryDto) {
    return this.service.stats(query);
  }

  @Delete("/")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async clear() {
    await this.service.hideAll();
  }

  @Post("/:appId")
  @RateLimit("recordRecentAppByUser")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async record(
    @ValidParams(RecentAppIdParamsDto) params: RecentAppIdParamsDto
  ) {
    await this.service.recordLaunch(params.appId);
  }

  @Delete("/:appId")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async hide(@ValidParams(RecentAppIdParamsDto) params: RecentAppIdParamsDto) {
    await this.service.hide(params.appId);
  }

  @Post("/:appId/restore")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async restore(
    @ValidParams(RecentAppIdParamsDto) params: RecentAppIdParamsDto
  ) {
    await this.service.restore(params.appId);
  }
}
