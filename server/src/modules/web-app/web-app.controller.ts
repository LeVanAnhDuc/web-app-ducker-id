// types
import type { WebAppService } from "./services";
import type {
  AdminAppsQueryRequest,
  AdminCreateAppRequest,
  AdminUpdateAppRequest,
  UserAppsQueryRequest
} from "./types";
// others
import { RequestContext } from "@/utils/request-context";

export class WebAppController {
  constructor(private readonly service: WebAppService) {}

  listApps = async (req: AdminAppsQueryRequest) =>
    this.service.listApps(req.query);

  listUserApps = async (req: UserAppsQueryRequest) => {
    const role = RequestContext.getUser()?.roles;
    return this.service.listUserApps(req.query, role);
  };

  createApp = async (req: AdminCreateAppRequest) =>
    this.service.createApp(req.body);

  updateApp = async (req: AdminUpdateAppRequest) =>
    this.service.updateApp(req.params.id, req.body);
}
