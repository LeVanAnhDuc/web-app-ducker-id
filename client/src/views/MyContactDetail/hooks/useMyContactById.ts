// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getMyContactById } from "@/requests/myContacts";
// others
import CONSTANTS from "@/constants";

const useMyContactById = (id: string) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.MY_CONTACT_DETAIL, id],
    queryFn: () => getMyContactById(id),
    enabled: Boolean(id)
  });

export default useMyContactById;
