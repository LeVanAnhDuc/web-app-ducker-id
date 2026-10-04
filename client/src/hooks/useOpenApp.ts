"use client";
// libs
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
// requests
import { recordRecentApp } from "@/requests/recentApps";
// others
import CONSTANTS from "@/constants";

/**
 * Every "open app" control goes through here so each launch is recorded for
 * Recently Used. The tab opens first, synchronously inside the click, so the
 * popup blocker never sees an async gap; the record is best-effort.
 */
const useOpenApp = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (app: { _id: string; homeUrl: string }) => {
      window.open(app.homeUrl, "_blank", "noopener,noreferrer");
      recordRecentApp(app._id)
        .then(() =>
          Promise.all([
            queryClient.invalidateQueries({
              queryKey: [CONSTANTS.QUERY_KEYS.RECENT_APPS]
            }),
            // Home ranks apps by this counter, so it goes stale on the same
            // click that refreshes the recent list.
            queryClient.invalidateQueries({
              queryKey: [CONSTANTS.QUERY_KEYS.RECENT_APPS_STATS]
            })
          ])
        )
        .catch(() => undefined);
    },
    [queryClient]
  );
};

export default useOpenApp;
