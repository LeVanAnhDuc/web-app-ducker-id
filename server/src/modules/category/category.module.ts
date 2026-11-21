// modules
import { MongoWebAppRepository } from "@/modules/web-app/repository/impl/mongo-web-app.repository";
// others
import { MongoCategoryRepository } from "./repository/impl/mongo-category.repository";
import { CategoryService } from "./services";
import { CategoryAdminController } from "./category-admin.controller";
import { CategoryController } from "./category.controller";

export const createCategoryModule = () => {
  const categoryRepository = new MongoCategoryRepository();
  const service = new CategoryService(
    categoryRepository,
    new MongoWebAppRepository()
  );

  return {
    categoryRepository,
    categoryAdminController: new CategoryAdminController(service),
    categoryController: new CategoryController(service)
  };
};
