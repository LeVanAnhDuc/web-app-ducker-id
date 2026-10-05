// types
import type { CategoryRepository } from "@/modules/category/repository/category.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { WebAppRepository } from "../repository/web-app.repository";

export interface WebAppServiceDeps {
  webAppRepo: WebAppRepository;
  categoryRepo: CategoryRepository;
  favoriteRepo: FavoriteRepository;
  accessPolicy: AccessPolicy;
}
