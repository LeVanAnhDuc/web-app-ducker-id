// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getAdminContactDetail } from "@/requests/contactAdmin";
// others
import CONSTANTS from "@/constants";

const useAdminContactDetail = (id: string) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_CONTACT_DETAIL, id],
    queryFn: () => getAdminContactDetail(id),
    enabled: Boolean(id)
  });

export default useAdminContactDetail;
