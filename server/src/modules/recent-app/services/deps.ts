// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { RecentAppRepository } from "../repository/recent-app.repository";

export interface RecentAppServiceDeps {
  recentAppRepo: RecentAppRepository;
  webAppRepo: WebAppRepository;
  favoriteRepo: FavoriteRepository;
  accessPolicy: AccessPolicy;
}
