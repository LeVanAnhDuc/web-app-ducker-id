// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { AuthenticationRole } from "@/types/User";
// requests
import { getAdminUsers } from "@/requests/adminUsers";
// others
import CONSTANTS from "@/constants";

const DEFAULT_LIMIT = 6;
const SEARCH_LIMIT = 20;

const useAdminUsersSearch = (
  search: string,
  role: AuthenticationRole | null,
  enabled = true
) => {
  const hasActive = search !== "" || role !== null;
  const limit = hasActive ? SEARCH_LIMIT : DEFAULT_LIMIT;

  return useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_USERS, search, role],
    queryFn: () =>
      getAdminUsers({
        ...(search && { search }),
        ...(role && { role }),
        limit
      }),
    enabled
  });
};

export default useAdminUsersSearch;
