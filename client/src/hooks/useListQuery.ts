"use client";

// libs
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
// types
import type { ListFilterDef, ListQueryState, SortOrder } from "@/types/List";
// hooks
import { useAnnounce, useDebouncedValue } from "@/hooks";
// others
import { useRouter, usePathname } from "@/i18n/navigation";
import CONSTANTS from "@/constants";
import { SORT_ORDER } from "@/constants/list";

const { LIST } = CONSTANTS;

const parsePage = (raw: string | null): number => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
};

const useListQuery = (filterDefs: ListFilterDef[] = []): ListQueryState => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tAnnounce = useTranslations("list.announce");
  const { announce } = useAnnounce();

  const urlSearch = searchParams.get(LIST.PARAM.SEARCH) ?? "";
  const page = parsePage(searchParams.get(LIST.PARAM.PAGE));
  const sortBy = searchParams.get(LIST.PARAM.SORT_BY) ?? undefined;
  const sortOrderRaw = searchParams.get(LIST.PARAM.SORT_ORDER);
  const sortOrder: SortOrder | undefined =
    sortOrderRaw === SORT_ORDER.ASC || sortOrderRaw === SORT_ORDER.DESC
      ? sortOrderRaw
      : undefined;

  const filters = useMemo(() => {
    const out: Record<string, string> = {};
    for (const def of filterDefs) {
      if (def.type === "dateRange") {
        const from = searchParams.get(LIST.PARAM.FROM_DATE);
        const to = searchParams.get(LIST.PARAM.TO_DATE);
        const preset = searchParams.get(LIST.PARAM.DATE_RANGE);
        if (from) out[LIST.PARAM.FROM_DATE] = from;
        if (to) out[LIST.PARAM.TO_DATE] = to;
        if (preset) out[LIST.PARAM.DATE_RANGE] = preset;
        continue;
      }
      const v = searchParams.get(def.key);
      if (!v) continue;
      if (def.type === "select" && !def.options.some((o) => o.value === v))
        continue;
      out[def.key] = v;
    }
    return out;
  }, [searchParams, filterDefs]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    for (const def of filterDefs) {
      if (def.type === "dateRange") {
        if (
          filters[LIST.PARAM.FROM_DATE] ||
          filters[LIST.PARAM.TO_DATE] ||
          filters[LIST.PARAM.DATE_RANGE]
        )
          n += 1;
      } else if (filters[def.key]) {
        n += 1;
      }
    }
    return n;
  }, [filters, filterDefs]);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(
    searchInput,
    LIST.SEARCH_DEBOUNCE_MS
  );
  const lastPushedSearch = useRef(urlSearch);

  useEffect(() => {
    setSearchInput(urlSearch);
    lastPushedSearch.current = urlSearch;
  }, [urlSearch]);

  const push = useCallback(
    (mutate: (p: URLSearchParams) => void, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      if (resetPage) next.set(LIST.PARAM.PAGE, "1");
      router.push(`${pathname}?${next.toString()}`);
    },
    [searchParams, router, pathname]
  );

  useEffect(() => {
    if (debouncedSearch === lastPushedSearch.current) return;
    lastPushedSearch.current = debouncedSearch;
    push((p) => {
      if (debouncedSearch) p.set(LIST.PARAM.SEARCH, debouncedSearch);
      else p.delete(LIST.PARAM.SEARCH);
    });
    announce(tAnnounce("filtersApplied"));
  }, [debouncedSearch]);

  const setSearch = useCallback((v: string) => setSearchInput(v), []);

  const setFilter = useCallback(
    (key: string, value: string) => {
      push((p) => {
        if (value) p.set(key, value);
        else p.delete(key);
      });
      announce(tAnnounce("filtersApplied"));
    },
    [push, announce, tAnnounce]
  );

  const setDateRange = useCallback(
    (preset: string, fromDate?: string, toDate?: string) => {
      push((p) => {
        p.delete(LIST.PARAM.DATE_RANGE);
        p.delete(LIST.PARAM.FROM_DATE);
        p.delete(LIST.PARAM.TO_DATE);
        if (preset && preset !== "all") {
          p.set(LIST.PARAM.DATE_RANGE, preset);
          if (fromDate) p.set(LIST.PARAM.FROM_DATE, fromDate);
          if (toDate) p.set(LIST.PARAM.TO_DATE, toDate);
        }
      });
      announce(tAnnounce("filtersApplied"));
    },
    [push, announce, tAnnounce]
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    lastPushedSearch.current = "";
    router.push(pathname);
    announce(tAnnounce("filtersCleared"));
  }, [router, pathname, announce, tAnnounce]);

  const setPage = useCallback(
    (p: number) => {
      push((sp) => sp.set(LIST.PARAM.PAGE, String(p)), false);
      announce(tAnnounce("pageChanged", { page: p }));
    },
    [push, announce, tAnnounce]
  );

  const setSort = useCallback(
    (by: string, order: SortOrder) => {
      push((p) => {
        p.set(LIST.PARAM.SORT_BY, by);
        p.set(LIST.PARAM.SORT_ORDER, order);
      }, false);
    },
    [push]
  );

  return {
    search: searchInput,
    appliedSearch: urlSearch,
    filters,
    page,
    sortBy,
    sortOrder,
    activeFilterCount,
    setSearch,
    setFilter,
    setDateRange,
    clearFilters,
    setPage,
    setSort
  };
};

export default useListQuery;
