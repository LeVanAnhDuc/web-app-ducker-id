// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { WebApp } from "@/types/AdminApps";
// requests
import { getAdminApps } from "@/requests/adminApps";

export const APP_CATALOG_QUERY_KEY = "adminAppCatalog";

const CATALOG_STALE_TIME_MS = 15 * 60 * 1000; // app catalog rarely changes

const useAppCatalog = () =>
  useQuery<WebApp[]>({
    queryKey: [APP_CATALOG_QUERY_KEY],
    queryFn: async () => (await getAdminApps()).items,
    staleTime: CATALOG_STALE_TIME_MS
  });

export default useAppCatalog;
