// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// others
import { forceLogoutAdminUser } from "@/mocks/AdminUsers";

const useForceLogoutAdminUser = () => {
  const tToast = useTranslations("adminUsers.toast");
  return useMutation({
    mutationFn: forceLogoutAdminUser,
    onSuccess: () => {
      toast.success(tToast("forceLogoutSuccess"));
    }
  });
};

export default useForceLogoutAdminUser;
