// libs
import { Get, JsonController } from "routing-controllers";
// types
import type { WebAppService } from "./services";
// common
import { Auth, RequestParam, Respond } from "@/common/routing";
// others
import { RequestContext } from "@/utils/request-context";
import { UserAppsQueryDto } from "./dtos/requests";

@JsonController("/apps")
@Auth()
export class WebAppController {
  constructor(private readonly service: WebAppService) {}

  @Get("/")
  @Respond({ message: "webApp:success.listApps" })
  listUserApps(@RequestParam(UserAppsQueryDto) query: UserAppsQueryDto) {
    const role = RequestContext.getUser()?.roles;
    return this.service.listUserApps(query, role);
  }
}
