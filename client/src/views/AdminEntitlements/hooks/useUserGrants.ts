// libs
import { useQuery } from "@tanstack/react-query";
// types
import type {
  EntitlementMatrixResponse,
  UserAccess
} from "@/types/AdminEntitlements";
// requests
import { getUserAccess } from "@/requests/adminEntitlements";

export const USER_GRANTS_QUERY_KEY = "adminUserGrants";

// Module-level so React Query memoises the result: MatrixFormSyncEffect
// resets the form whenever this object changes identity.
const indexByUser = ({
  users
}: EntitlementMatrixResponse): Record<string, UserAccess> =>
  Object.fromEntries(users.map((row) => [row.userId, row]));

const useUserGrants = (userIds: string[]) =>
  useQuery({
    queryKey: [USER_GRANTS_QUERY_KEY, userIds],
    queryFn: () => getUserAccess(userIds),
    select: indexByUser,
    enabled: userIds.length > 0
  });

export default useUserGrants;
