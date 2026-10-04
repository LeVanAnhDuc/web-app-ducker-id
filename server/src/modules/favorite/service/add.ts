// types
import type { FavoriteServiceDeps } from "./deps";
// others
import { RequestContext } from "@/utils/request-context";

export const add = async (
  deps: FavoriteServiceDeps,
  appId: string
): Promise<void> => {
  const userId = RequestContext.requireUserId();
  const role = RequestContext.getUser()?.roles;
  await deps.favoritableGuard.assert(appId, role);
  await deps.favoriteRepo.add(userId, appId);
};
