// types
import type { CategoryRepository } from "@/modules/category/repository/category.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// others
import { MongoWebAppRepository } from "./repository/impl/mongo-web-app.repository";
import { MongoFavoriteRepository } from "@/modules/favorite/repository/impl/mongo-favorite.repository";
import { WebAppService } from "./services";
import { WebAppAdminController } from "./web-app-admin.controller";
import { WebAppController } from "./web-app.controller";

export const createWebAppModule = (
  categoryRepo: CategoryRepository,
  accessPolicy: AccessPolicy,
  notificationDispatcher: NotificationDispatcher
) => {
  const service = new WebAppService(
    new MongoWebAppRepository(),
    categoryRepo,
    new MongoFavoriteRepository(),
    accessPolicy,
    notificationDispatcher
  );

  return {
    webAppAdminController: new WebAppAdminController(service),
    webAppController: new WebAppController(service)
  };
};
