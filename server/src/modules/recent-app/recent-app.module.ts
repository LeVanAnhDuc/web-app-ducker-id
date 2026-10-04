// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
// modules
import { MongoWebAppRepository } from "@/modules/web-app/repository/impl/mongo-web-app.repository";
// others
import { MongoRecentAppRepository } from "./repository/impl/mongo-recent-app.repository";
import { RecentAppService } from "./services";
import { RecentAppController } from "./recent-app.controller";
import { createRecentAppUserRoutes } from "./recent-app.routes";

export const createRecentAppModule = (
  favoriteRepo: FavoriteRepository,
  rateLimiter: RateLimiterMiddleware
) => {
  const service = new RecentAppService({
    recentAppRepo: new MongoRecentAppRepository(),
    webAppRepo: new MongoWebAppRepository(),
    favoriteRepo
  });
  const controller = new RecentAppController(service);

  return {
    recentAppService: service,
    recentAppUserRouter: createRecentAppUserRoutes(controller, rateLimiter)
  };
};
