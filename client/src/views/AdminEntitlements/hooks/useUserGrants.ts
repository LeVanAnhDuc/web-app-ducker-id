// libs
import { useQuery } from "@tanstack/react-query";
// others
import { getUserGrants } from "@/mocks/AdminEntitlements";

export const USER_GRANTS_QUERY_KEY = "adminUserGrants";

const useUserGrants = (userIds: string[]) =>
  useQuery({
    queryKey: [USER_GRANTS_QUERY_KEY, userIds],
    queryFn: () => getUserGrants(userIds),
    enabled: userIds.length > 0
  });

export default useUserGrants;
