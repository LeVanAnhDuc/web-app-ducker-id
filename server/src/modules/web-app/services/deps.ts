// types
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { WebAppRepository } from "../repositories/web-app.repository";
import type { WebAppCategoryRepository } from "../repositories/web-app-category.repository";

export interface WebAppServiceDeps {
  webAppRepo: WebAppRepository;
  categoryRepo: WebAppCategoryRepository;
  favoriteRepo: FavoriteRepository;
}
