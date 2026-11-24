// libs
import { StatusCodes } from "http-status-codes";
import { Get, JsonController, Patch, Post } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { WebAppService } from "./services";
// common
import { ApiErrors, ApiProperty, Listed } from "@/common/openapi";
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
import { AdminAppCreatedDto, AdminAppDto } from "./dtos";
import {
  AdminAppsQueryDto,
  CreateAppBodyDto,
  UpdateAppBodyDto
} from "./dtos/requests";

const APP_ID = [
  IsRequiredObjectId("webApp:validation.id.invalid"),
  ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the app"
  })
];

@JsonController("/admin/apps")
@Auth()
@Admin()
@OpenAPI({ tags: ["Web App Admin"] })
export class WebAppAdminController {
  constructor(private readonly service: WebAppService) {}

  @Get("/")
  @OpenAPI({
    summary: "List apps (admin)",
    description:
      "List registered apps for the admin console. Not paginated: every match is returned."
  })
  @Respond({ message: "webApp:success.listApps", type: Listed(AdminAppDto) })
  listApps(@RequestParam(AdminAppsQueryDto) query: AdminAppsQueryDto) {
    return this.service.listApps(query);
  }

  @Post("/")
  @OpenAPI({
    summary: "Register a new app (admin)",
    description:
      "Register a satellite app with Ducker ID. Generates an OAuth `clientId` and `clientSecret`; the secret is returned **once** in the response and will not be retrievable again (null for a public client).\n\n**Business rules:**\n- `name` must be unique across all apps (lowercase, alphanumeric + hyphens)\n- `categoryIds` must be 1-5 distinct existing categories (otherwise 400 `WEB_APP_CATEGORY_NOT_FOUND`)\n- `clientSecret` is bcrypt-hashed before storage; the plaintext is returned only in this response"
  })
  @ApiErrors(409)
  @Respond({
    status: StatusCodes.CREATED,
    message: "webApp:success.createApp",
    type: AdminAppCreatedDto
  })
  createApp(@ValidBody(CreateAppBodyDto) body: CreateAppBodyDto) {
    return this.service.createApp(body);
  }

  @Patch("/:id")
  @OpenAPI({
    summary: "Update an app (admin)",
    description:
      "Update one or more fields of a registered app. At least one field must be provided.\n\n**Business rules:**\n- `name` must remain unique across all apps (conflict returns 409 `WEB_APP_NAME_EXISTS`)\n- `categoryIds` must be 1-5 distinct existing categories (otherwise 400 `WEB_APP_CATEGORY_NOT_FOUND`)\n- Setting `status` to `inactive` pauses the app: it stays in the registry but is hidden from users' dashboards"
  })
  @ApiErrors(404, 409)
  @Respond({ message: "webApp:success.updateApp", type: AdminAppDto })
  updateApp(
    @PathVariable("id", ...APP_ID) id: string,
    @ValidBody(UpdateAppBodyDto) body: UpdateAppBodyDto
  ) {
    return this.service.updateApp(id, body);
  }
}
