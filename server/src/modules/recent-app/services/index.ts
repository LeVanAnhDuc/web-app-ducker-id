// types
import type { PaginatedResult } from "@/common/pagination";
import type { ListRecentAppsQuery, RecentAppDto } from "../types";
import type { RecentAppServiceDeps } from "./deps";
// others
import { hide } from "./hide";
import { hideAll } from "./hide-all";
import { list } from "./list";
import { record } from "./record";
import { recordLaunch } from "./record-launch";
import { restore } from "./restore";

export class RecentAppService {
  constructor(private readonly deps: RecentAppServiceDeps) {}

  list(query: ListRecentAppsQuery): Promise<PaginatedResult<RecentAppDto>> {
    return list(this.deps, query);
  }

  recordLaunch(appId: string): Promise<void> {
    return recordLaunch(this.deps, appId);
  }

  record(userId: string, webAppId: string): Promise<void> {
    return record(this.deps, userId, webAppId);
  }

  hide(appId: string): Promise<void> {
    return hide(this.deps, appId);
  }

  hideAll(): Promise<void> {
    return hideAll(this.deps);
  }

  restore(appId: string): Promise<void> {
    return restore(this.deps, appId);
  }
}
