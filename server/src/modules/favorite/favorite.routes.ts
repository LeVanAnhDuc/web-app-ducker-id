// libs
import { Router } from "express";
// types
import type { FavoriteController } from "./favorite.controller";
// validators
import {
  favoriteAppIdParamSchema,
  listFavoritesQuerySchema
} from "@/validators/schemas/favorite";
// others
import { authGuard, paramsPipe, queryPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createFavoriteUserRoutes = (
  controller: FavoriteController
): Router => {
  const router = Router();
  const favorites = Router();

  favorites.use(authGuard);

  favorites.get(
    "/",
    queryPipe(listFavoritesQuerySchema),
    asyncHandler(controller.list)
  );
  favorites.post(
    "/:appId",
    paramsPipe(favoriteAppIdParamSchema),
    asyncHandler(controller.add)
  );
  favorites.delete(
    "/:appId",
    paramsPipe(favoriteAppIdParamSchema),
    asyncHandler(controller.remove)
  );

  router.use("/users/me/favorites", favorites);
  return router;
};
