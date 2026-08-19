// libs
import { useQuery, keepPreviousData } from "@tanstack/react-query";
// types
import type { FavoritesQueryParams } from "@/types/Apps";
// requests
import { getFavorites } from "@/requests/favorites";
// others
import CONSTANTS from "@/constants";

const useFavorites = (params: FavoritesQueryParams) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.FAVORITES, params],
    queryFn: () => getFavorites(params),
    placeholderData: keepPreviousData
  });

export default useFavorites;
