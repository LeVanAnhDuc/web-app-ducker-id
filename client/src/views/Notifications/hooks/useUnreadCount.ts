// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getUnreadCount } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";

const useUnreadCount = () =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS_UNREAD_COUNT],
    queryFn: getUnreadCount
  });

export default useUnreadCount;
