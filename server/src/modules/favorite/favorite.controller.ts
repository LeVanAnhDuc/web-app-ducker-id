// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post } from "routing-controllers";
// types
import type { FavoriteService } from "./services";
// common
import { Auth, PathVariable, RequestParam, Respond } from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { ListFavoritesQueryDto } from "./dtos/requests";

@JsonController("/users/me/favorites")
@Auth()
export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  @Get("/")
  @Respond({ message: "favorite:success.list" })
  list(@RequestParam(ListFavoritesQueryDto) query: ListFavoritesQueryDto) {
    return this.service.list(query);
  }

  @Post("/:appId")
  @Respond({
    status: StatusCodes.CREATED,
    message: "favorite:success.add"
  })
  async add(
    @PathVariable(
      "appId",
      IsRequiredObjectId("favorite:validation.appId.invalid")
    )
    appId: string
  ) {
    await this.service.add(appId);
  }

  @Delete("/:appId")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async remove(
    @PathVariable(
      "appId",
      IsRequiredObjectId("favorite:validation.appId.invalid")
    )
    appId: string
  ) {
    await this.service.remove(appId);
  }
}
