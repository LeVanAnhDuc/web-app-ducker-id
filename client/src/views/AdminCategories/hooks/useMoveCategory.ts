// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
// types
import type { CategoryMoveDirection } from "@/types/AdminCategories";
// hooks
import { useInvalidateCategories } from "@/hooks";
// requests
import { moveAdminCategory } from "@/requests/adminCategories";
// others
import CONSTANTS from "@/constants";

/**
 * Not optimistic (DR-15): the server renumbers every row and returns the list,
 * which replaces the cache as-is — a tab that was out of date shows the real
 * order instead of its own guess.
 */
const useMoveCategory = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCategories();

  return useMutation({
    mutationFn: ({
      id,
      direction
    }: {
      id: string;
      direction: CategoryMoveDirection;
    }) => moveAdminCategory(id, direction),
    onSuccess: (list) => {
      queryClient.setQueryData([CONSTANTS.QUERY_KEYS.ADMIN_CATEGORIES], list);
      void invalidate();
    },
    onError: () => invalidate()
  });
};

export default useMoveCategory;
