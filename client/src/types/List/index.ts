// types
import type LIST from "@/constants/list";
import type { SORT_ORDER } from "@/constants/list";

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

export type DateRangePreset = (typeof LIST.DATE_PRESETS)[number];

export type ListFilterOption = { value: string; label: string };

export type ListFilterDef =
  | {
      key: string;
      type: "select";
      label: string;
      options: ListFilterOption[];
      allLabel?: string;
    }
  | { key: string; type: "dateRange"; label: string }
  | { key: string; type: "text"; label: string; placeholder?: string };

export interface ListQueryState {
  /** Live search input value (debounced before it reaches the URL). Bind this to the search box. */
  search: string;
  /** Search value committed to the URL (post-debounce). Use this when building API request params. */
  appliedSearch: string;
  filters: Record<string, string>;
  page: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  activeFilterCount: number;
  setSearch: (value: string) => void;
  setFilter: (key: string, value: string) => void;
  setDateRange: (preset: string, fromDate?: string, toDate?: string) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setSort: (sortBy: string, sortOrder: SortOrder) => void;
}
