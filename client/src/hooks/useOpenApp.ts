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
          queryClient.invalidateQueries({
            queryKey: [CONSTANTS.QUERY_KEYS.RECENT_APPS]
          })
        )
        .catch(() => undefined);
    },
    [queryClient]
  );
};

export default useOpenApp;
