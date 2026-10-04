// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// requests
import { createAdminCategory } from "@/requests/adminCategories";
// hooks
import useInvalidateCategories from "./useInvalidateCategories";

/** Shared by the category page and the quick-create dialog in the app form. */
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
