// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { UserCategory } from "@/types/Apps";
// requests
import { getAppCategories } from "@/requests/apps";
// others
import CONSTANTS from "@/constants";

/**
 * The public category list behind every launcher filter. SSR data, when the
 * page has it, seeds the cache but is refetched on mount — it may be up to 60s
 * old, and a category deleted since then must not linger in the filter.
 */
const useAppCategories = (initialData?: UserCategory[] | null) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.APP_CATEGORIES],
    queryFn: getAppCategories,
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: 0
  });

export default useAppCategories;
