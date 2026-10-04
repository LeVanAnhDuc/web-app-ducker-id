"use client";
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// types
import type {
  PaginatedUserAppsResponse,
  FavoritesResponse,
  UserApp
} from "@/types/Apps";
import type { RecentAppsResponse } from "@/types/RecentlyUsed";
// hooks
import { useAnnounce } from "@/hooks";
// requests
import { addFavorite, removeFavorite } from "@/requests/favorites";
// others
import CONSTANTS from "@/constants";

const { QUERY_KEYS } = CONSTANTS;

const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("favorites");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: ({
      appId,
      isFavorite
    }: {
      appId: string;
      isFavorite: boolean;
    }) => (isFavorite ? removeFavorite(appId) : addFavorite(appId)),
    onMutate: async ({ appId, isFavorite }) => {
      const next = !isFavorite;
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.APPS] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.FAVORITES] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.RECENT_APPS] });
      const prevApps = queryClient.getQueriesData<PaginatedUserAppsResponse>({
        queryKey: [QUERY_KEYS.APPS]
      });
      const prevFavs = queryClient.getQueriesData<FavoritesResponse>({
        queryKey: [QUERY_KEYS.FAVORITES]
      });
      const prevRecent = queryClient.getQueriesData<
        InfiniteData<RecentAppsResponse>
      >({ queryKey: [QUERY_KEYS.RECENT_APPS] });
      queryClient.setQueriesData<PaginatedUserAppsResponse>(
        { queryKey: [QUERY_KEYS.APPS] },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((a: UserApp) =>
                  a._id === appId ? { ...a, isFavorite: next } : a
                )
              }
            : old
      );
      queryClient.setQueriesData<FavoritesResponse>(
        { queryKey: [QUERY_KEYS.FAVORITES] },
        (old) =>
          old
            ? { items: old.items.filter((a: UserApp) => a._id !== appId) }
            : old
      );
      queryClient.setQueriesData<InfiniteData<RecentAppsResponse>>(
        { queryKey: [QUERY_KEYS.RECENT_APPS] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.map((a) =>
                    a._id === appId ? { ...a, isFavorite: next } : a
                  )
                }))
              }
            : old
      );
      return { prevApps, prevFavs, prevRecent };
    },
    onError: (_err, _vars, context) => {
      context?.prevApps?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      context?.prevFavs?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      context?.prevRecent?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      announce(t("announce.error"));
    },
    onSuccess: (_data, { isFavorite }) => {
      announce(isFavorite ? t("announce.removed") : t("announce.added"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FAVORITES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECENT_APPS] });
    }
  });
};

export default useToggleFavorite;
