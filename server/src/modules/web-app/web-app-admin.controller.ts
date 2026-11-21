// libs
import { StatusCodes } from "http-status-codes";
import { Get, JsonController, Patch, Post } from "routing-controllers";
// types
import type { WebAppService } from "./services";
// common
import {
  Admin,
  Auth,
  PathVariable,
  RequestParam,
  Respond,
  ValidBody
} from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import {
  AdminAppsQueryDto,
  CreateAppBodyDto,
  UpdateAppBodyDto
} from "./dtos/requests";

@JsonController("/admin/apps")
@Auth()
@Admin()
export class WebAppAdminController {
  constructor(private readonly service: WebAppService) {}

  @Get("/")
  @Respond({ message: "webApp:success.listApps" })
  listApps(@RequestParam(AdminAppsQueryDto) query: AdminAppsQueryDto) {
    return this.service.listApps(query);
  }

  @Post("/")
  @Respond({
    status: StatusCodes.CREATED,
    message: "webApp:success.createApp"
  })
  createApp(@ValidBody(CreateAppBodyDto) body: CreateAppBodyDto) {
    return this.service.createApp(body);
  }

  @Patch("/:id")
  @Respond({ message: "webApp:success.updateApp" })
  updateApp(
    @PathVariable("id", IsRequiredObjectId("webApp:validation.id.invalid"))
    id: string,
    @ValidBody(UpdateAppBodyDto) body: UpdateAppBodyDto
  ) {
    return this.service.updateApp(id, body);
  }
}
