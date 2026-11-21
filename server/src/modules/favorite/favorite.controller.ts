// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { FavoriteService } from "./services";
// common
import { ApiErrors } from "@/common/openapi";
import { Auth, Respond, ValidParams, ValidQuery } from "@/common/routing";
// others
import { FavoriteListDto } from "./dtos";
import { FavoriteAppIdParamsDto, ListFavoritesQueryDto } from "./dtos/requests";

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
  @Respond({ message: "favorite:success.list", type: FavoriteListDto })
  list(@ValidQuery(ListFavoritesQueryDto) query: ListFavoritesQueryDto) {
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
  async add(
    @ValidParams(FavoriteAppIdParamsDto) params: FavoriteAppIdParamsDto
  ) {
    await this.service.add(params.appId);
  }

  @Delete("/:appId")
  @OpenAPI({
    summary: "Remove an app from my favourites",
    description: "Idempotent."
  })
  @Respond({ status: StatusCodes.NO_CONTENT })
  async remove(
    @ValidParams(FavoriteAppIdParamsDto) params: FavoriteAppIdParamsDto
  ) {
    await this.service.remove(params.appId);
  }
}
