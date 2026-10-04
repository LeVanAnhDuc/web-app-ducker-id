"use client";
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// hooks
import { useAnnounce } from "@/hooks";
// requests
import { clearRecentApps } from "@/requests/recentApps";
// others
import CONSTANTS from "@/constants";

const useClearRecentApps = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("recentlyUsed");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: clearRecentApps,
    onSuccess: () => {
      announce(t("announce.cleared"));
      toast.success(t("toast.cleared"));
    },
    onError: () => toast.error(t("toast.error")),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.RECENT_APPS]
      })
  });
};

export default useClearRecentApps;
