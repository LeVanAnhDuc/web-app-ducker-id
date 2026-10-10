// types
import type { Response } from "express";
import type { WebAppService } from "./services";
import type {
  AdminAppsQueryRequest,
  AdminCreateAppRequest,
  AdminUpdateAppRequest,
  UserAppsQueryRequest
} from "./types";
// common
import { OkSuccess, CreatedSuccess } from "@/common/responses";
// others
import { RequestContext } from "@/utils/request-context";

export class WebAppController {
  constructor(private readonly service: WebAppService) {}

  listApps = async (
    req: AdminAppsQueryRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.listApps(req.query);
    new OkSuccess({
      data,
      message: "webApp:success.listApps"
    }).send(req, res);
  };

  listUserApps = async (
    req: UserAppsQueryRequest,
    res: Response
  ): Promise<void> => {
    const role = RequestContext.getUser()?.roles;
    const data = await this.service.listUserApps(req.query, role);
    new OkSuccess({
      data,
      message: "webApp:success.listApps"
    }).send(req, res);
  };

  createApp = async (
    req: AdminCreateAppRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.createApp(req.body);
    new CreatedSuccess({
      data,
      message: "webApp:success.createApp"
    }).send(req, res);
  };

  updateApp = async (
    req: AdminUpdateAppRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.updateApp(req.params.id, req.body);
    new OkSuccess({
      data,
      message: "webApp:success.updateApp"
    }).send(req, res);
  };
}
