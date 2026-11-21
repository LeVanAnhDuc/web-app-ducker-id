// libs
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { FavoriteController } from "./favorite.controller";
// common
import { handle } from "@/common/responses";
// others
import { FavoriteAppIdParamsDto, ListFavoritesQueryDto } from "./dtos/requests";
import { authGuard, paramsPipe, queryPipe } from "@/middlewares";

export const createFavoriteUserRoutes = (
  controller: FavoriteController
): Router => {
  const router = Router();
  const favorites = Router();

  favorites.use(authGuard);

  favorites.get(
    "/",
    queryPipe(ListFavoritesQueryDto),
    handle(controller.list, { message: "favorite:success.list" })
  );
  favorites.post(
    "/:appId",
    paramsPipe(FavoriteAppIdParamsDto),
    handle(controller.add, {
      status: StatusCodes.CREATED,
      message: "favorite:success.add"
    })
  );
  favorites.delete(
    "/:appId",
    paramsPipe(FavoriteAppIdParamsDto),
    handle(controller.remove, { status: StatusCodes.NO_CONTENT })
  );

  router.use("/users/me/favorites", favorites);
  return router;
};
