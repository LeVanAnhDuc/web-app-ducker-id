"use client";
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// types
import type {
  PaginatedUserAppsResponse,
  FavoritesResponse,
  UserApp
} from "@/types/Apps";
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
      const prevApps = queryClient.getQueriesData<PaginatedUserAppsResponse>({
        queryKey: [QUERY_KEYS.APPS]
      });
      const prevFavs = queryClient.getQueriesData<FavoritesResponse>({
        queryKey: [QUERY_KEYS.FAVORITES]
      });
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
      return { prevApps, prevFavs };
    },
    onError: (_err, _vars, context) => {
      context?.prevApps?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      context?.prevFavs?.forEach(([key, data]) =>
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
    }
  });
};

export default useToggleFavorite;
