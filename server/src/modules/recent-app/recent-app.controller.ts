// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post } from "routing-controllers";
// types
import type { RecentAppService } from "./services";
// common
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
import {
  ListRecentAppsQueryDto,
  RecentAppsStatsQueryDto
} from "./dtos/requests";

@JsonController("/users/me/recent-apps")
@Auth()
export class RecentAppController {
  constructor(private readonly service: RecentAppService) {}

  @Get("/")
  @Respond({ message: "recentApp:success.list" })
  list(@RequestParam(ListRecentAppsQueryDto) query: ListRecentAppsQueryDto) {
    return this.service.list(query);
  }

  // Before "/:appId" so the literal segment is not read as an app id.
  @Get("/stats")
  @Respond({ message: "recentApp:success.stats" })
  stats(@RequestParam(RecentAppsStatsQueryDto) query: RecentAppsStatsQueryDto) {
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
    @PathVariable(
      "appId",
      IsRequiredObjectId("recentApp:validation.appId.invalid")
    )
    appId: string
  ) {
    await this.service.recordLaunch(appId);
  }

  @Delete("/:appId")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async hide(
    @PathVariable(
      "appId",
      IsRequiredObjectId("recentApp:validation.appId.invalid")
    )
    appId: string
  ) {
    await this.service.hide(appId);
  }

  @Post("/:appId/restore")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async restore(
    @PathVariable(
      "appId",
      IsRequiredObjectId("recentApp:validation.appId.invalid")
    )
    appId: string
  ) {
    await this.service.restore(appId);
  }
}
