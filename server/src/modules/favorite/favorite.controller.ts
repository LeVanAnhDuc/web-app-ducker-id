// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post } from "routing-controllers";
// types
import type { FavoriteService } from "./services";
// common
import { Auth, Respond, ValidParams, ValidQuery } from "@/common/routing";
// others
import { FavoriteAppIdParamsDto, ListFavoritesQueryDto } from "./dtos/requests";

@JsonController("/users/me/favorites")
@Auth()
export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  @Get("/")
  @Respond({ message: "favorite:success.list" })
  list(@ValidQuery(ListFavoritesQueryDto) query: ListFavoritesQueryDto) {
    return this.service.list(query);
  }

  @Post("/:appId")
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
  @Respond({ status: StatusCodes.NO_CONTENT })
  async remove(
    @ValidParams(FavoriteAppIdParamsDto) params: FavoriteAppIdParamsDto
  ) {
    await this.service.remove(params.appId);
  }
}
