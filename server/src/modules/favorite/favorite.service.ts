// types
import type { FavoriteRepository } from "./favorite.repository";
import type { WebAppRepository } from "@/modules/web-app/repositories";
import type { AppFavoritableGuard } from "./guards";
import type { UserAppDto } from "@/modules/web-app/dtos";
import type { ListFavoritesQuery } from "./types";
// dtos
import { toFavoriteAppDto } from "./dtos";
// constants
import { FAVORITE_SORTS } from "./constants";
// others
import { RequestContext } from "@/utils/request-context";

export class FavoriteService {
  constructor(
    private readonly favoriteRepo: FavoriteRepository,
    private readonly webAppRepo: WebAppRepository,
    private readonly favoritableGuard: AppFavoritableGuard
  ) {}

  async add(appId: string): Promise<void> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;
    await this.favoritableGuard.assert(appId, role);
    await this.favoriteRepo.add(userId, appId);
  }

  async remove(appId: string): Promise<void> {
    const userId = RequestContext.requireUserId();
    await this.favoriteRepo.remove(userId, appId);
  }

  async list(query: ListFavoritesQuery): Promise<{ items: UserAppDto[] }> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;

    const orderedIds = await this.favoriteRepo.findWebAppIdsByUser(userId);
    if (orderedIds.length === 0) return { items: [] };

    const docs = await this.webAppRepo.findActiveByIds(orderedIds, {
      role,
      search: query.search,
      categoryId: query.categoryId
    });

    let items = docs.map(toFavoriteAppDto);

    if (query.sort === FAVORITE_SORTS.NAME) {
      items = [...items].sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );
    } else {
      const rank = new Map(orderedIds.map((id, idx) => [id, idx]));
      items = [...items].sort(
        (a, b) => (rank.get(a._id) ?? 0) - (rank.get(b._id) ?? 0)
      );
    }

    return { items };
  }
}
