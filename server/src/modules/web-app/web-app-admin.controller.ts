// libs
import { StatusCodes } from "http-status-codes";
import { Get, JsonController, Patch, Post } from "routing-controllers";
// types
import type { WebAppService } from "./services";
// common
import {
  Admin,
  Auth,
  Respond,
  ValidBody,
  ValidParams,
  ValidQuery
} from "@/common/routing";
// others
import {
  AdminAppsQueryDto,
  AppIdParamsDto,
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
  listApps(@ValidQuery(AdminAppsQueryDto) query: AdminAppsQueryDto) {
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
    @ValidParams(AppIdParamsDto) params: AppIdParamsDto,
    @ValidBody(UpdateAppBodyDto) body: UpdateAppBodyDto
  ) {
    return this.service.updateApp(params.id, body);
  }
}
