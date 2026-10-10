// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { CategoryReassignment } from "@/types/AdminCategories";
// hooks
import { useInvalidateCategories } from "@/hooks";
// requests
import { deleteAdminCategory } from "@/requests/adminCategories";

const useDeleteCategory = () => {
  const invalidate = useInvalidateCategories();
  const tToast = useTranslations("adminCategories.toast");

  return useMutation({
    mutationFn: ({
      id,
      reassignments
    }: {
      id: string;
      reassignments: CategoryReassignment[];
    }) => deleteAdminCategory(id, reassignments),
    onSuccess: async () => {
      await invalidate();
      toast.success(tToast("deleteSuccess"));
    }
  });
};

export default useDeleteCategory;
