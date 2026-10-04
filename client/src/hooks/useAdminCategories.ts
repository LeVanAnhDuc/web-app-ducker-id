// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getAdminCategories } from "@/requests/adminCategories";
// others
import CONSTANTS from "@/constants";

/** Admin category list, in display order — shared by the category page and the app registry. */
const useAdminCategories = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_CATEGORIES],
    queryFn: getAdminCategories,
    enabled: options?.enabled ?? true
  });

export default useAdminCategories;
