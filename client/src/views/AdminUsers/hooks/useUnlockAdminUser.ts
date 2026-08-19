// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// others
import CONSTANTS from "@/constants";
import { unlockAdminUser } from "@/requests/adminUsers";

const useUnlockAdminUser = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminUsers.toast");
  return useMutation({
    mutationFn: unlockAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_USERS_LIST]
      });
      toast.success(tToast("unlockSuccess"));
    }
  });
};

export default useUnlockAdminUser;
