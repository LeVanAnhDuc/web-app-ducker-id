// types
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
// modules
import { MongoWebAppRepository } from "@/modules/web-app/repository/impl/mongo-web-app.repository";
// others
import { MongoRecentAppRepository } from "./repository/impl/mongo-recent-app.repository";
import { RecentAppService } from "./recent-app.service";
import { RecentAppController } from "./recent-app.controller";

export const createRecentAppModule = (
  favoriteRepo: FavoriteRepository,
  accessPolicy: AccessPolicy
) => {
  const service = new RecentAppService(
    new MongoRecentAppRepository(),
    new MongoWebAppRepository(),
    favoriteRepo,
    accessPolicy
  );
  const recentAppController = new RecentAppController(service);

  return {
    recentAppService: service,
    recentAppController
  };
};
