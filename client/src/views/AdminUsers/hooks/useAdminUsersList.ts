// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { AdminUsersQueryParams } from "@/types/AdminUsers";
// requests
import { getAdminUsers } from "@/requests/adminUsers";
// others
import CONSTANTS from "@/constants";

const useAdminUsersList = (params: AdminUsersQueryParams) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_USERS_LIST, params],
    queryFn: () => getAdminUsers(params)
  });

export default useAdminUsersList;
