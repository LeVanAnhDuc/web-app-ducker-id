// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { FavoriteRepository } from "../repository/favorite.repository";
import type { AppFavoritableGuard } from "../guards";

export interface FavoriteServiceDeps {
  favoriteRepo: FavoriteRepository;
  webAppRepo: WebAppRepository;
  favoritableGuard: AppFavoritableGuard;
}
