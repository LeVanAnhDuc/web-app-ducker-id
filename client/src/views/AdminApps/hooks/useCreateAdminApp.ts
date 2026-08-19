// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// requests
import { createAdminApp } from "@/requests/adminApps";
// others
import CONSTANTS from "@/constants";

const useCreateAdminApp = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminApps.toast");

  return useMutation({
    mutationFn: createAdminApp,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_APPS]
      });
      queryClient.invalidateQueries({ queryKey: [CONSTANTS.QUERY_KEYS.APPS] });
      toast.success(tToast("createSuccess"));
    }
  });
};

export default useCreateAdminApp;
