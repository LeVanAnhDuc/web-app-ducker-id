// types
import type { PaginatedResult } from "@/common/pagination";
import type { RecentAppDto } from "../types";
import type {
  ListRecentAppsQueryDto,
  RecentAppsStatsQueryDto
} from "../dtos/requests";
import type { RecentAppsStatsDto } from "../dtos";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { RecentAppRepository } from "../repository/recent-app.repository";
// others
import { hide } from "./hide";
import { hideAll } from "./hide-all";
import { list } from "./list";
import { record } from "./record";
import { recordLaunch } from "./record-launch";
import { restore } from "./restore";
import { stats } from "./stats";

export class RecentAppService {
  constructor(
    private readonly recentAppRepo: RecentAppRepository,
    private readonly webAppRepo: WebAppRepository,
    private readonly favoriteRepo: FavoriteRepository,
    private readonly accessPolicy: AccessPolicy
  ) {}

  list(query: ListRecentAppsQueryDto): Promise<PaginatedResult<RecentAppDto>> {
    return list(
      {
        recentAppRepo: this.recentAppRepo,
        webAppRepo: this.webAppRepo,
        favoriteRepo: this.favoriteRepo,
        accessPolicy: this.accessPolicy
      },
      query
    );
  }

  stats(query: RecentAppsStatsQueryDto): Promise<RecentAppsStatsDto> {
    return stats(
      {
        recentAppRepo: this.recentAppRepo,
        webAppRepo: this.webAppRepo,
        accessPolicy: this.accessPolicy
      },
      query
    );
  }

  recordLaunch(appId: string): Promise<void> {
    return recordLaunch(
      {
        recentAppRepo: this.recentAppRepo,
        webAppRepo: this.webAppRepo,
        accessPolicy: this.accessPolicy
      },
      appId
    );
  }

  record(userId: string, webAppId: string): Promise<void> {
    return record(this.recentAppRepo, userId, webAppId);
  }

  hide(appId: string): Promise<void> {
    return hide(this.recentAppRepo, appId);
  }

  hideAll(): Promise<void> {
    return hideAll(this.recentAppRepo);
  }

  restore(appId: string): Promise<void> {
    return restore(this.recentAppRepo, appId);
  }
}
