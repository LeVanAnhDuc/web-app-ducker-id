// libs
import { useInfiniteQuery } from "@tanstack/react-query";
// requests
import { getRecentApps } from "@/requests/recentApps";
// others
import CONSTANTS from "@/constants";

const useRecentApps = (search?: string) =>
  useInfiniteQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.RECENT_APPS, { search }],
    queryFn: ({ pageParam }) =>
      getRecentApps({
        page: pageParam,
        limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE,
        ...(search && { search })
      }),
    initialPageParam: CONSTANTS.LIST.DEFAULT_PAGE as number,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined
  });

export default useRecentApps;
