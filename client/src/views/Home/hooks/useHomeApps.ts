// libs
import { useQuery, keepPreviousData } from "@tanstack/react-query";
// requests
import { getApps } from "@/requests/apps";

export const HOME_APPS_LIMIT = 8;

const useHomeApps = () =>
  useQuery({
    queryKey: ["apps", { limit: HOME_APPS_LIMIT }],
    queryFn: () => getApps({ limit: HOME_APPS_LIMIT }),
    placeholderData: keepPreviousData
  });

export default useHomeApps;
