// others
import { MongoFavoriteRepository } from "./favorite.repository";
import { MongoWebAppRepository } from "@/modules/web-app/repositories";
import { AppFavoritableGuard } from "./guards";
import { FavoriteService } from "./favorite.service";
import { FavoriteController } from "./favorite.controller";
import { createFavoriteUserRoutes } from "./favorite.routes";

export const createFavoriteModule = () => {
  const favoriteRepo = new MongoFavoriteRepository();
  const webAppRepo = new MongoWebAppRepository();
  const guard = new AppFavoritableGuard(webAppRepo);
  const service = new FavoriteService(favoriteRepo, webAppRepo, guard);
  const controller = new FavoriteController(service);

  return {
    favoriteRepository: favoriteRepo,
    favoriteUserRouter: createFavoriteUserRoutes(controller)
  };
};
