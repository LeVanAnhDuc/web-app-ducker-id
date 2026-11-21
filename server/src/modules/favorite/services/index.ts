// types
import type { UserAppDto } from "@/modules/web-app/dtos";
import type { ListFavoritesQueryDto } from "../dtos/requests";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { FavoriteRepository } from "../repository/favorite.repository";
import type { AppFavoritableGuard } from "../guards";
// others
import { add } from "./add";
import { list } from "./list";
import { remove } from "./remove";

export class FavoriteService {
  constructor(
    private readonly favoriteRepo: FavoriteRepository,
    private readonly webAppRepo: WebAppRepository,
    private readonly favoritableGuard: AppFavoritableGuard,
    private readonly accessPolicy: AccessPolicy
  ) {}

  add(appId: string): Promise<void> {
    return add(
      {
        favoriteRepo: this.favoriteRepo,
        favoritableGuard: this.favoritableGuard
      },
      appId
    );
  }

  remove(appId: string): Promise<void> {
    return remove(this.favoriteRepo, appId);
  }

  list(query: ListFavoritesQueryDto): Promise<{ items: UserAppDto[] }> {
    return list(
      {
        favoriteRepo: this.favoriteRepo,
        webAppRepo: this.webAppRepo,
        accessPolicy: this.accessPolicy
      },
      query
    );
  }
}
