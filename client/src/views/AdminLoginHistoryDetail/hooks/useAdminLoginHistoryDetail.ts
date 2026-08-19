// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getAdminLoginHistoryDetail } from "@/requests/loginHistory";
// others
import CONSTANTS from "@/constants";

const useAdminLoginHistoryDetail = (id: string) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_LOGIN_HISTORY_DETAIL, id],
    queryFn: () => getAdminLoginHistoryDetail(id),
    enabled: Boolean(id)
  });

export default useAdminLoginHistoryDetail;
