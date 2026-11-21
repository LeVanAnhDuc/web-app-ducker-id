// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// requests
import { createAdminCategory } from "@/requests/adminCategories";
// hooks
import useInvalidateCategories from "./useInvalidateCategories";

const useCreateCategory = () => {
  const invalidate = useInvalidateCategories();
  const tToast = useTranslations("adminCategories.toast");

  return useMutation({
    mutationFn: createAdminCategory,
    onSuccess: async () => {
      await invalidate();
      toast.success(tToast("createSuccess"));
    }
  });
};

export default useCreateCategory;
