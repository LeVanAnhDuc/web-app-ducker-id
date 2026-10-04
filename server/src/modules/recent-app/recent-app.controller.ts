// types
import type { Request, Response } from "express";
import type {
  ListRecentAppsRequest,
  RecentAppIdRequest
} from "@/modules/recent-app/types";
import type { RecentAppService } from "./services";
// commons
import { NoContentSuccess, OkSuccess } from "@/common/responses";

export class RecentAppController {
  constructor(private readonly service: RecentAppService) {}

  list = async (req: ListRecentAppsRequest, res: Response): Promise<void> => {
    const data = await this.service.list(req.query);
    new OkSuccess({ data, message: "recentApp:success.list" }).send(req, res);
  };

  record = async (req: RecentAppIdRequest, res: Response): Promise<void> => {
    await this.service.recordLaunch(req.params.appId);
    new NoContentSuccess().send(req, res);
  };

  hide = async (req: RecentAppIdRequest, res: Response): Promise<void> => {
    await this.service.hide(req.params.appId);
    new NoContentSuccess().send(req, res);
  };

  restore = async (req: RecentAppIdRequest, res: Response): Promise<void> => {
    await this.service.restore(req.params.appId);
    new NoContentSuccess().send(req, res);
  };

  clear = async (req: Request, res: Response): Promise<void> => {
    await this.service.hideAll();
    new NoContentSuccess().send(req, res);
  };
}
