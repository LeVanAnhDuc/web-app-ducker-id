// libs
import { Router } from "express";
// types
import type { FavoriteController } from "./favorite.controller";
// common
import { STATUS_CODES } from "@/common/http";
import { handle } from "@/common/responses";
// validators
import {
  favoriteAppIdParamSchema,
  listFavoritesQuerySchema
} from "@/validators/schemas/favorite";
// others
import { authGuard, paramsPipe, queryPipe } from "@/middlewares";

export const createFavoriteUserRoutes = (
  controller: FavoriteController
): Router => {
  const router = Router();
  const favorites = Router();

  favorites.use(authGuard);

  favorites.get(
    "/",
    queryPipe(listFavoritesQuerySchema),
    handle(controller.list, { message: "favorite:success.list" })
  );
  favorites.post(
    "/:appId",
    paramsPipe(favoriteAppIdParamSchema),
    handle(controller.add, {
      status: STATUS_CODES.CREATED,
      message: "favorite:success.add"
    })
  );
  favorites.delete(
    "/:appId",
    paramsPipe(favoriteAppIdParamSchema),
    handle(controller.remove, { status: STATUS_CODES.NO_CONTENT })
  );

  router.use("/users/me/favorites", favorites);
  return router;
};
