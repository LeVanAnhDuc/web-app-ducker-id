"use client";

// libs
import { useCallback } from "react";
import { useLocale } from "next-intl";
// types
import type { DateTimeVariant, DateTimeValue } from "@/types/DateTime";
// hooks
import useHasMounted from "./useHasMounted";
// others
import { formatDateTime } from "@/utils";

/**
 * Returns a locale-bound formatter. Callback arg order is (variant, value)
 * — intentionally variant-first for readable call sites, e.g. ft("relative", iso).
 */
const useFormatTime = () => {
  const locale = useLocale();
  const mounted = useHasMounted();

  return useCallback(
    (variant: DateTimeVariant, value: DateTimeValue): string => {
      // Relative text depends on "now"; before mount, server-now vs client-now
      // could diverge → hydration mismatch. Defer to a stable placeholder.
      if (!mounted && variant === "relative") return "—";
      return formatDateTime(
        value,
        variant,
        locale,
        mounted ? undefined : { timeZone: "UTC" }
      );
    },
    [locale, mounted]
  );
};

export default useFormatTime;
