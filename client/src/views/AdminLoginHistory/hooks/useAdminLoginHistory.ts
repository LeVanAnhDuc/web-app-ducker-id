// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { AdminLoginHistoryQueryParams } from "@/types/LoginHistory";
// requests
import { getAdminLoginHistory } from "@/requests/loginHistory";
// others
import CONSTANTS from "@/constants";

const useAdminLoginHistory = (params: AdminLoginHistoryQueryParams) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_LOGIN_HISTORY, params],
    queryFn: () => getAdminLoginHistory(params)
  });

export default useAdminLoginHistory;
