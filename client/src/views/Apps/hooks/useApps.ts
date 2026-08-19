// libs
import { useQuery, keepPreviousData } from "@tanstack/react-query";
// types
import type { UserAppsQueryParams } from "@/types/Apps";
// requests
import { getApps } from "@/requests/apps";
// others
import CONSTANTS from "@/constants";

const useApps = (params: UserAppsQueryParams) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.APPS, params],
    queryFn: () => getApps(params),
    placeholderData: keepPreviousData
  });

export default useApps;
