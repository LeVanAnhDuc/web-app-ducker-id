// libs
import { useInfiniteQuery } from "@tanstack/react-query";
// types
import type { NotificationCategory } from "@/types/Notification";
// requests
import { getNotifications } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";

const useNotifications = ({
  isRead,
  category,
  limit = CONSTANTS.LIST.DEFAULT_PAGE_SIZE
}: {
  isRead?: boolean;
  category?: NotificationCategory;
  limit?: number;
} = {}) =>
  useInfiniteQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS, { isRead, category, limit }],
    queryFn: ({ pageParam }) =>
      getNotifications({ page: pageParam, limit, isRead, category }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    // New notifications arrive from events, not from this tab: refetch every
    // time the panel opens or the page mounts instead of trusting the cache.
    staleTime: 0
  });

export default useNotifications;
