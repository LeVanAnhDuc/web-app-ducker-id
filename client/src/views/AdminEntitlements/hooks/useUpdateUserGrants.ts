// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { EntitlementMatrixResponse } from "@/types/AdminEntitlements";
// requests
import { updateUserAccess } from "@/requests/adminEntitlements";
// others
import { USER_GRANTS_QUERY_KEY } from "./useUserGrants";

const useUpdateUserGrants = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminEntitlements.toast");
  return useMutation({
    mutationFn: updateUserAccess,
    onSuccess: ({ users: updated }) => {
      // Patch the saved rows in place first: the matrix leaves edit mode as
      // soon as this resolves, and would otherwise reset to the old rows
      // until the refetch lands.
      const byId = new Map(updated.map((row) => [row.userId, row]));
      queryClient.setQueriesData<EntitlementMatrixResponse>(
        { queryKey: [USER_GRANTS_QUERY_KEY] },
        (current) =>
          current && {
            users: current.users.map((row) => byId.get(row.userId) ?? row)
          }
      );
      queryClient.invalidateQueries({ queryKey: [USER_GRANTS_QUERY_KEY] });
      toast.success(tToast("saveSuccess"));
    },
    onError: () => toast.error(tToast("error"))
  });
};

export default useUpdateUserGrants;
