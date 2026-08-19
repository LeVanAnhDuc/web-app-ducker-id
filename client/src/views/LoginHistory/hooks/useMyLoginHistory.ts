// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { LoginHistoryQueryParams } from "@/types/LoginHistory";
// requests
import { getMyLoginHistory } from "@/requests/loginHistory";
// others
import CONSTANTS from "@/constants";

const useMyLoginHistory = (params: LoginHistoryQueryParams) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.LOGIN_HISTORY, params],
    queryFn: () => getMyLoginHistory(params)
  });

export default useMyLoginHistory;
