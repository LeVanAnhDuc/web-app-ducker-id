// types
import type {
  ListRecentAppsRequest,
  RecentAppIdRequest,
  RecentAppsStatsRequest
} from "@/modules/recent-app/types";
import type { RecentAppService } from "./services";

export class RecentAppController {
  constructor(private readonly service: RecentAppService) {}

  list = async (req: ListRecentAppsRequest) => this.service.list(req.query);

  stats = async (req: RecentAppsStatsRequest) => this.service.stats(req.query);

  record = async (req: RecentAppIdRequest) => {
    await this.service.recordLaunch(req.params.appId);
  };

  hide = async (req: RecentAppIdRequest) => {
    await this.service.hide(req.params.appId);
  };

  restore = async (req: RecentAppIdRequest) => {
    await this.service.restore(req.params.appId);
  };

  clear = async () => {
    await this.service.hideAll();
  };
}
