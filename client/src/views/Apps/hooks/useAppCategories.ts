// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getAppCategories } from "@/requests/apps";

export const APP_CATEGORIES_QUERY_KEY = "appCategories";

const useAppCategories = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: [APP_CATEGORIES_QUERY_KEY],
    queryFn: getAppCategories,
    enabled: options?.enabled ?? true
  });

export default useAppCategories;
