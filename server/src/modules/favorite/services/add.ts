// types
import type { FavoriteRepository } from "../repository/favorite.repository";
import type { AppFavoritableGuard } from "../guards";
// others
import { RequestContext } from "@/utils/request-context";

export const add = async (
  deps: {
    favoriteRepo: FavoriteRepository;
    favoritableGuard: AppFavoritableGuard;
  },
  appId: string
): Promise<void> => {
  const userId = RequestContext.requireUserId();
  const role = RequestContext.getUser()?.roles;
  await deps.favoritableGuard.assert(appId, userId, role);
  await deps.favoriteRepo.add(userId, appId);
};
