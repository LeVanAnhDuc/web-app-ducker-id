// constants
import type FAVORITES_SORT from "@/constants/favoritesSort";

export interface UserApp {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  category: string | null;
  categorySlug: string | null;
  isFavorite: boolean;
}

export type PaginatedUserAppsResponse = Paginated<UserApp>;

export interface UserAppsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export interface UserCategory {
  _id: string;
  displayName: string;
  slug: string;
}

export type FavoritesSortKey =
  (typeof FAVORITES_SORT)[keyof typeof FAVORITES_SORT];

export interface FavoritesQueryParams {
  search?: string;
  categoryId?: string;
  sort?: FavoritesSortKey;
}

export interface FavoritesResponse {
  items: UserApp[];
}
