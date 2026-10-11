// types
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
// others
import { MongoFavoriteRepository } from "./repository/impl/mongo-favorite.repository";
import { MongoWebAppRepository } from "@/modules/web-app/repository/impl/mongo-web-app.repository";
import { AppFavoritableGuard } from "./guards";
import { FavoriteService } from "./services";
import { FavoriteController } from "./favorite.controller";
import { createFavoriteUserRoutes } from "./favorite.routes";

export const createFavoriteModule = (accessPolicy: AccessPolicy) => {
  const favoriteRepo = new MongoFavoriteRepository();
  const webAppRepo = new MongoWebAppRepository();
  const favoritableGuard = new AppFavoritableGuard(webAppRepo, accessPolicy);
  const service = new FavoriteService({
    favoriteRepo,
    webAppRepo,
    favoritableGuard,
    accessPolicy
  });
  const controller = new FavoriteController(service);

  return {
    favoriteRepository: favoriteRepo,
    favoriteUserRouter: createFavoriteUserRoutes(controller)
  };
};
