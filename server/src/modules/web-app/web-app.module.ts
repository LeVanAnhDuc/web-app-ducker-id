// types
import type { RateLimiterMiddleware } from "@/middlewares/common/rate-limiter.middleware";
// others
import {
  MongoWebAppRepository,
  MongoWebAppCategoryRepository
} from "./repositories";
import { MongoFavoriteRepository } from "@/modules/favorite/favorite.repository";
import { WebAppService } from "./web-app.service";
import { WebAppController } from "./web-app.controller";
import {
  createAdminWebAppRoutes,
  createUserWebAppRoutes
} from "./web-app.routes";

export const createWebAppModule = (rateLimiter: RateLimiterMiddleware) => {
  const webAppRepo = new MongoWebAppRepository();
  const categoryRepo = new MongoWebAppCategoryRepository();
  const favoriteRepo = new MongoFavoriteRepository();
  const service = new WebAppService(webAppRepo, categoryRepo, favoriteRepo);
  const controller = new WebAppController(service);

  return {
    webAppAdminRouter: createAdminWebAppRoutes(controller),
    webAppUserRouter: createUserWebAppRoutes(controller, rateLimiter)
  };
};
