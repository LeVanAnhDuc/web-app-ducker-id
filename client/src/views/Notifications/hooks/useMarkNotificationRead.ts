// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// requests
import { markNotificationRead } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";
import { errorToast } from "@/utils";

const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("notifications.toast");
  return useMutation({
    mutationFn: markNotificationRead,
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS]
      });
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS_UNREAD_COUNT]
      });
    },
    onError: () => errorToast(t("markReadError"))
  });
};

export default useMarkNotificationRead;
