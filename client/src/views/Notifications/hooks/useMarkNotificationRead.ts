// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
// requests
import { markNotificationRead } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";

const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
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

export default useMarkNotificationRead;
