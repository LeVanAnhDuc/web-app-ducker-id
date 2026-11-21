// types
import type { FavoriteRepository } from "../repository/favorite.repository";
// others
import { RequestContext } from "@/utils/request-context";

export const remove = async (
  favoriteRepo: FavoriteRepository,
  appId: string
): Promise<void> => {
  const userId = RequestContext.requireUserId();
  await favoriteRepo.remove(userId, appId);
};
