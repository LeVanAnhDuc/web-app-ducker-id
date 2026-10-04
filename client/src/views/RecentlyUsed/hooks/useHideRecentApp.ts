"use client";
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { InfiniteData } from "@tanstack/react-query";
import type { RecentApp, RecentAppsResponse } from "@/types/RecentlyUsed";
// hooks
import { useAnnounce } from "@/hooks";
// requests
import { hideRecentApp, restoreRecentApp } from "@/requests/recentApps";
// others
import CONSTANTS from "@/constants";

const QUERY_KEY = [CONSTANTS.QUERY_KEYS.RECENT_APPS];

/**
 * Optimistic: the row leaves the list at once. The server only soft-deletes,
 * so the toast's Undo is a real restore, not a re-insert.
 */
const useHideRecentApp = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("recentlyUsed");
  const { announce } = useAnnounce();

  const restore = useMutation({
    mutationFn: (app: RecentApp) => restoreRecentApp(app._id),
    onSuccess: (_data, app) =>
      announce(t("announce.restored", { name: app.displayName })),
    onError: () => toast.error(t("toast.error")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  });

  return useMutation({
    mutationFn: (app: RecentApp) => hideRecentApp(app._id),
    onMutate: async (app) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueriesData<
        InfiniteData<RecentAppsResponse>
      >({ queryKey: QUERY_KEY });
      queryClient.setQueriesData<InfiniteData<RecentAppsResponse>>(
        { queryKey: QUERY_KEY },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((a) => a._id !== app._id)
                }))
              }
            : old
      );
      return { previous };
    },
    onError: (_err, _app, context) => {
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      toast.error(t("toast.error"));
    },
    onSuccess: (_data, app) => {
      announce(t("announce.removed", { name: app.displayName }));
      toast(t("toast.removed", { name: app.displayName }), {
        action: { label: t("toast.undo"), onClick: () => restore.mutate(app) }
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  });
};

export default useHideRecentApp;
