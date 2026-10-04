// types
import type { WebAppRepository } from "@/modules/web-app/repositories";
import type { FavoriteRepository } from "../repository/favorite.repository";
import type { AppFavoritableGuard } from "../guards";

export interface FavoriteServiceDeps {
  favoriteRepo: FavoriteRepository;
  webAppRepo: WebAppRepository;
  favoritableGuard: AppFavoritableGuard;
}
