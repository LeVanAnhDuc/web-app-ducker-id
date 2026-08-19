// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
// requests
import { markAllNotificationsRead } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";

const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS]
      });
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS_UNREAD_COUNT]
      });
    }
  });
};

export default useMarkAllRead;
