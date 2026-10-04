"use client";

// libs
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
// others
import CONSTANTS from "@/constants";

const { QUERY_KEYS } = CONSTANTS;

/**
 * A category change shows up in every list that renders category chips or a
 * category filter, so all of them are refetched, not just the admin table.
 */
const CATEGORY_DEPENDENT_KEYS = [
  QUERY_KEYS.ADMIN_CATEGORIES,
  QUERY_KEYS.APP_CATEGORIES,
  QUERY_KEYS.ADMIN_APPS,
  QUERY_KEYS.APPS,
  QUERY_KEYS.FAVORITES,
  QUERY_KEYS.RECENT_APPS
] as const;

const useInvalidateCategories = () => {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all(
        CATEGORY_DEPENDENT_KEYS.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })
        )
      ),
    [queryClient]
  );
};

export default useInvalidateCategories;
