// types
import type { UserAppDto } from "@/modules/web-app/dtos";
import type { ListFavoritesQueryDto } from "./dtos/requests";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { FavoriteRepository } from "./repository/favorite.repository";
import type { AppFavoritableGuard } from "./guards";
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
    private readonly favoritableGuard: AppFavoritableGuard,
    private readonly accessPolicy: AccessPolicy
  ) {}

  async add(appId: string): Promise<void> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;
    await this.favoritableGuard.assert(appId, userId, role);
    await this.favoriteRepo.add(userId, appId);
  }

  async remove(appId: string): Promise<void> {
    const userId = RequestContext.requireUserId();
    await this.favoriteRepo.remove(userId, appId);
  }

  async list(query: ListFavoritesQueryDto): Promise<{ items: UserAppDto[] }> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;

    const orderedIds = await this.favoriteRepo.findWebAppIdsByUser(userId);
    if (orderedIds.length === 0) return { items: [] };

    const access = await this.accessPolicy.resolveScope(userId, role);
    const docs = await this.webAppRepo.findActiveByIds(orderedIds, {
      access,
      search: query.search,
      categoryId: query.categoryId
    });

    const items = docs.map(toFavoriteAppDto);

    if (query.sort === FAVORITE_SORTS.NAME) {
      return {
        items: [...items].sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        )
      };
    }

    const rank = new Map(orderedIds.map((id, idx) => [id, idx]));
    return {
      items: [...items].sort(
        (a, b) => (rank.get(a._id) ?? 0) - (rank.get(b._id) ?? 0)
      )
    };
  }
}
