// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { ContactStatus } from "@/types/ContactAdmin";
// requests
import { updateContactStatus } from "@/requests/contactAdmin";
// others
import CONSTANTS from "@/constants";

const useUpdateContactStatus = (id: string) => {
  const queryClient = useQueryClient();
  const t = useTranslations("contactAdmin.admin.detail.updateStatus");
  return useMutation({
    mutationFn: (status: ContactStatus) => updateContactStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_CONTACT_DETAIL, id]
      });
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_CONTACT_LIST]
      });
      toast.success(t("success"));
    }
  });
};

export default useUpdateContactStatus;
