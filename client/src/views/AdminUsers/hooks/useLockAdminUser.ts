// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// others
import CONSTANTS from "@/constants";
import { lockAdminUser } from "@/requests/adminUsers";

const useLockAdminUser = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminUsers.toast");
  return useMutation({
    mutationFn: lockAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_USERS_LIST]
      });
      toast.success(tToast("lockSuccess"));
    }
  });
};

export default useLockAdminUser;
