// libs
import { Get, JsonController } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { WebAppService } from "./services";
// common
import { Paginated } from "@/common/openapi";
import { Auth, RequestParam, Respond } from "@/common/routing";
// others
import { RequestContext } from "@/utils/request-context";
import { UserAppDto } from "./dtos";
import { UserAppsQueryDto } from "./dtos/requests";

@JsonController("/apps")
@Auth()
@OpenAPI({ tags: ["Web App"] })
export class WebAppController {
  constructor(private readonly service: WebAppService) {}

  @Get("/")
  @OpenAPI({
    summary: "List apps (user)",
    description:
      "List the active-app catalog for the launcher. Returns apps with `status=active`; OAuth internals and secrets are never exposed.\n\n**Visibility:** an app is listed when the caller's role is in its `requiredRoles`, or the caller is an admin, or an entitlement override grants it; an override can also hide an app despite the role."
  })
  @Respond({ message: "webApp:success.listApps", type: Paginated(UserAppDto) })
  listUserApps(@RequestParam(UserAppsQueryDto) query: UserAppsQueryDto) {
    const role = RequestContext.getUser()?.roles;
    return this.service.listUserApps(query, role);
  }
}
