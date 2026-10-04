// types
import type { RateLimiterMiddleware } from "@/middlewares";
// modules
import { MongoWebAppRepository } from "@/modules/web-app/repository/impl/mongo-web-app.repository";
// others
import { MongoCategoryRepository } from "./repository/impl/mongo-category.repository";
import { CategoryService } from "./services";
import { CategoryController } from "./category.controller";
import {
  createCategoryAdminRoutes,
  createCategoryUserRoutes
} from "./category.routes";

export const createCategoryModule = (rateLimiter: RateLimiterMiddleware) => {
  const categoryRepository = new MongoCategoryRepository();
  const service = new CategoryService({
    categoryRepo: categoryRepository,
    webAppRepo: new MongoWebAppRepository()
  });
  const controller = new CategoryController(service);

  return {
    categoryRepository,
    categoryAdminRouter: createCategoryAdminRoutes(controller, rateLimiter),
    categoryUserRouter: createCategoryUserRoutes(controller, rateLimiter)
  };
};
