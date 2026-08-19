// libs
import { useInfiniteQuery } from "@tanstack/react-query";
// requests
import { getNotifications } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";

const useNotifications = (isRead?: boolean) =>
  useInfiniteQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS, { isRead }],
    queryFn: ({ pageParam }) =>
      getNotifications({
        page: pageParam,
        limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE,
        isRead
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined
  });

export default useNotifications;
