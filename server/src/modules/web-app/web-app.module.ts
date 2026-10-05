// types
import type { CategoryRepository } from "@/modules/category/repository/category.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
// others
import { MongoWebAppRepository } from "./repository/impl/mongo-web-app.repository";
import { MongoFavoriteRepository } from "@/modules/favorite/repository/impl/mongo-favorite.repository";
import { WebAppService } from "./services";
import { WebAppController } from "./web-app.controller";
import {
  createAdminWebAppRoutes,
  createUserWebAppRoutes
} from "./web-app.routes";

export const createWebAppModule = (
  categoryRepo: CategoryRepository,
  accessPolicy: AccessPolicy
) => {
  const webAppRepo = new MongoWebAppRepository();
  const favoriteRepo = new MongoFavoriteRepository();
  const service = new WebAppService({
    webAppRepo,
    categoryRepo,
    favoriteRepo,
    accessPolicy
  });
  const controller = new WebAppController(service);

  return {
    webAppAdminRouter: createAdminWebAppRoutes(controller),
    webAppUserRouter: createUserWebAppRoutes(controller)
  };
};
