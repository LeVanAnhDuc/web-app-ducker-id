// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { FavoriteRepository } from "../repository/favorite.repository";
import type { AppFavoritableGuard } from "../guards";

export interface FavoriteServiceDeps {
  favoriteRepo: FavoriteRepository;
  webAppRepo: WebAppRepository;
  favoritableGuard: AppFavoritableGuard;
  accessPolicy: AccessPolicy;
}
