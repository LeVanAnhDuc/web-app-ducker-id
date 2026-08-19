// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// others
import { updateUserGrants } from "@/mocks/AdminEntitlements";
import { USER_GRANTS_QUERY_KEY } from "./useUserGrants";

const useUpdateUserGrants = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminEntitlements.toast");
  return useMutation({
    mutationFn: updateUserGrants,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_GRANTS_QUERY_KEY] });
      toast.success(tToast("saveSuccess"));
    },
    onError: () => toast.error(tToast("error"))
  });
};

export default useUpdateUserGrants;
