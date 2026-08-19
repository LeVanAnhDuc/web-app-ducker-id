// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { MyContactsQueryParams } from "@/types/MyContacts";
// requests
import { getMyContacts } from "@/requests/myContacts";
// others
import CONSTANTS from "@/constants";

export const MY_CONTACTS_QUERY_KEY = CONSTANTS.QUERY_KEYS.MY_CONTACTS;

const useMyContacts = (params: MyContactsQueryParams) =>
  useQuery({
    queryKey: [MY_CONTACTS_QUERY_KEY, params],
    queryFn: () => getMyContacts(params)
  });

export default useMyContacts;
