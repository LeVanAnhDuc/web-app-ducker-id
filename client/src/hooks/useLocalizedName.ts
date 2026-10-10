"use client";

// libs
import { useCallback } from "react";
import { useLocale } from "next-intl";
// types
import type { CategoryName } from "@/types/Apps";
// others
import { pickLocalized } from "@/utils";

/** Category names come in both languages; pick the one for the current locale. */
const useLocalizedName = () => {
  const locale = useLocale();
  return useCallback(
    (name: CategoryName) => pickLocalized(name, locale),
    [locale]
  );
};

export default useLocalizedName;
