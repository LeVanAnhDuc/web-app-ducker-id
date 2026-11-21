// types
import type { UserAppDto } from "@/modules/web-app/dtos";
import type { ListFavoritesQueryDto } from "../dtos/requests";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { FavoriteRepository } from "../repository/favorite.repository";
// dtos
import { toFavoriteAppDto } from "../dtos";
// constants
import { FAVORITE_SORTS } from "../constants";
// others
import { RequestContext } from "@/utils/request-context";

export const list = async (
  deps: {
    favoriteRepo: FavoriteRepository;
    webAppRepo: WebAppRepository;
    accessPolicy: AccessPolicy;
  },
  query: ListFavoritesQueryDto
): Promise<{ items: UserAppDto[] }> => {
  const userId = RequestContext.requireUserId();
  const role = RequestContext.getUser()?.roles;

  const orderedIds = await deps.favoriteRepo.findWebAppIdsByUser(userId);
  if (orderedIds.length === 0) return { items: [] };

  const access = await deps.accessPolicy.resolveScope(userId, role);
  const docs = await deps.webAppRepo.findActiveByIds(orderedIds, {
    access,
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
};
