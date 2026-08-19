// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { AppStatus } from "@/types/AdminApps";
// requests
import { setAdminAppStatus } from "@/requests/adminApps";
// others
import CONSTANTS from "@/constants";

const useSetAdminAppStatus = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminApps.toast");

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppStatus }) =>
      setAdminAppStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_APPS]
      });
      queryClient.invalidateQueries({ queryKey: [CONSTANTS.QUERY_KEYS.APPS] });
      toast.success(
        variables.status === CONSTANTS.APP_STATUS.INACTIVE
          ? tToast("hidden")
          : tToast("reactivated")
      );
    }
  });
};

export default useSetAdminAppStatus;
