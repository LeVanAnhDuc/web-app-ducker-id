"use client";

// libs
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
// others
import { useRouter, usePathname } from "@/i18n/navigation";

/** Read/write a single URL query param. Returns [value, setValue]. Empty string removes the param. */
const useSearchParamState = (
  key: string,
  defaultValue = ""
): [string, (value: string) => void] => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(key, next);
      else params.delete(key);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, pathname, router, searchParams]
  );

  return [value, setValue];
};

export default useSearchParamState;
