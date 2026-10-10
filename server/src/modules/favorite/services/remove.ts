// types
import type { FavoriteServiceDeps } from "./deps";
// others
import { RequestContext } from "@/utils/request-context";

export const remove = async (
  deps: FavoriteServiceDeps,
  appId: string
): Promise<void> => {
  const userId = RequestContext.requireUserId();
  await deps.favoriteRepo.remove(userId, appId);
};
