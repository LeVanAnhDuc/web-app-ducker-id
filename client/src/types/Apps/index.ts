// constants
import type FAVORITES_SORT from "@/constants/favoritesSort";

export interface UserApp {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  /** In the order the admin chose; the first one is the primary category. */
  categories: UserCategory[];
  isFavorite: boolean;
}

export type PaginatedUserAppsResponse = Paginated<UserApp>;

export interface UserAppsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export interface CategoryName {
  en: string;
  vi: string;
}

export interface UserCategory {
  _id: string;
  slug: string;
  name: CategoryName;
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
