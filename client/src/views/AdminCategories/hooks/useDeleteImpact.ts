// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getCategoryDeleteImpact } from "@/requests/adminCategories";
// others
import CONSTANTS from "@/constants";

/** Always fresh: the dialog decides what to ask for from this answer. */
const useDeleteImpact = (id: string | null) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_CATEGORY_DELETE_IMPACT, id],
    queryFn: () => getCategoryDeleteImpact(id as string),
    enabled: id !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false
  });

export default useDeleteImpact;
