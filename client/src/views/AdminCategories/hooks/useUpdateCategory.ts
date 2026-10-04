// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { CategoryUpdateInput } from "@/types/AdminCategories";
// hooks
import { useInvalidateCategories } from "@/hooks";
// requests
import { updateAdminCategory } from "@/requests/adminCategories";

const useUpdateCategory = () => {
  const invalidate = useInvalidateCategories();
  const tToast = useTranslations("adminCategories.toast");

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryUpdateInput }) =>
      updateAdminCategory(id, input),
    onSuccess: async () => {
      await invalidate();
      toast.success(tToast("updateSuccess"));
    },
    // Renamed or deleted elsewhere: whatever happened, show the server's list.
    onError: () => invalidate()
  });
};

export default useUpdateCategory;
