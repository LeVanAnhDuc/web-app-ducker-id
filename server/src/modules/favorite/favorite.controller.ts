// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { FavoriteService } from "./services";
// common
import { ApiErrors, ApiProperty, Listed } from "@/common/openapi";
import { Auth, PathVariable, RequestParam, Respond } from "@/common/routing";
// modules
import { UserAppDto } from "@/modules/web-app/dtos";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { ListFavoritesQueryDto } from "./dtos/requests";

const APP_ID = [
  IsRequiredObjectId("favorite:validation.appId.invalid"),
  ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB _id of the app"
  })
];

@JsonController("/users/me/favorites")
@Auth()
@OpenAPI({ tags: ["Favorites"] })
export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  @Get("/")
  @OpenAPI({
    summary: "List my favourite apps",
    description:
      "Only apps the caller may still open. Not paginated: the list is the caller's own pins."
  })
  @Respond({ message: "favorite:success.list", type: Listed(UserAppDto) })
  list(@RequestParam(ListFavoritesQueryDto) query: ListFavoritesQueryDto) {
    return this.service.list(query);
  }

  @Post("/:appId")
  @OpenAPI({
    summary: "Add an app to my favourites",
    description: "Idempotent. The caller must be allowed to open the app."
  })
  @ApiErrors(404)
  @Respond({
    status: StatusCodes.CREATED,
    message: "favorite:success.add"
  })
  async add(@PathVariable("appId", ...APP_ID) appId: string) {
    await this.service.add(appId);
  }

  @Delete("/:appId")
  @OpenAPI({
    summary: "Remove an app from my favourites",
    description: "Idempotent."
  })
  @Respond({ status: StatusCodes.NO_CONTENT })
  async remove(@PathVariable("appId", ...APP_ID) appId: string) {
    await this.service.remove(appId);
  }
}
