// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { AdminContactQuery } from "@/types/ContactAdmin";
// requests
import { getAdminContact } from "@/requests/contactAdmin";
// others
import CONSTANTS from "@/constants";

const useAdminContactList = (params: AdminContactQuery) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_CONTACT_LIST, params],
    queryFn: () => getAdminContact(params)
  });

export default useAdminContactList;
