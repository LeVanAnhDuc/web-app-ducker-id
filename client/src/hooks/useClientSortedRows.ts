// libs
import { useMemo } from "react";
// types
import type { SortOrder } from "@/types/List";
// others
import { SORT_ORDER } from "@/constants/list";

/**
 * Client-side stable sort for list rows.
 *
 * CONSTRAINT: only use for client-side tables where the ENTIRE dataset lives on
 * one page (e.g. AdminApps `getAdminApps` returns all items, totalPages=1). Do
 * NOT use with server-paginated tables — it would only sort the current page.
 *
 * Returns rows untouched (server order) when there is no active sort or no
 * accessor registered for the sort key.
 *
 * Each accessor MUST return a single consistent type (all `string` OR all
 * `number`) across rows — mixing types within one column yields undefined
 * ordering.
 */
const useClientSortedRows = <T>(
  rows: T[],
  sortBy: string | undefined,
  sortOrder: SortOrder | undefined,
  accessors: Record<string, (row: T) => string | number>
): T[] =>
  useMemo(() => {
    if (!sortBy || !sortOrder) return rows;
    const accessor = accessors[sortBy];
    if (!accessor) return rows;
    const dir = sortOrder === SORT_ORDER.DESC ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sortBy, sortOrder, accessors]);

export default useClientSortedRows;
