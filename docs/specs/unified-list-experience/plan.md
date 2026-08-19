# Unified List Experience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thống nhất search/filter và cách trình bày trang trên mọi trang list/table của client thành một concept duy nhất, dùng chung 1 hook (`useListQuery`) + bộ shell component, với URL query params là source of truth.

**Architecture:** Tạo tầng nền tảng `src/components/list/*` + hook `src/hooks/useListQuery.ts` + types `src/types/List` + i18n namespace `list`. Filter khai báo declarative (`ListFilterDef`) trong `dataSources`. Mỗi trang list migrate sang shell: `ListPageShell → ListPageHeader → ListToolbar (Search + Filters popover) → ListContent (loading/empty/data) → ListPagination`. Filter áp dụng tức thì onChange; search debounce 300ms; tất cả ghi/đọc URL.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, next-intl, React Query, Tailwind 4 + shadcn/ui (Popover, Select), lucide-react.

**Side tagging:** Toàn bộ là **FE** (`client/src/**`) trừ Task 1 là **FS** (shared types). KHÔNG đụng `server/src/**` (không đổi API contract). KHÔNG env mới, KHÔNG đổi Mongoose schema.

**Verification note (FE):** Client KHÔNG có jest/unit test (`next build` lo type-check; behavior do E2E dual-gate §4.3 lo). Vì vậy mỗi task "verify" = `cd client && yarn lint && npx tsc --noEmit` (+ `yarn build` ở task green-checks cuối). Behavior verify ở Phase 2 (E2E). Đây là lệch có chủ đích so với TDD-unit của skill, theo client CLAUDE.md.

**Commit gate:** Review ON (mặc định §7) → implementer **stage** mỗi task, KHÔNG commit per-task; main loop trình diff tổng thể cho user duyệt 1 lần rồi mới commit. (Các bước "Commit" dưới đây ghi message gợi ý cho trường hợp Review OFF.)

---

## File Structure

**Tạo mới (foundation):**
- `src/types/List/index.ts` — `ListFilterDef`, `ListFilterOption`, `ListQueryState`.
- `src/hooks/useListQuery.ts` — hook URL state + debounce + announce.
- `src/components/list/ListPageShell/index.tsx`
- `src/components/list/ListPageHeader/index.tsx`
- `src/components/list/ListToolbar/index.tsx`
- `src/components/list/ListFilterPanel/index.tsx`
- `src/components/list/DateRangeFilter/index.tsx`
- `src/components/list/ListContent/index.tsx`
- `src/components/list/ListEmptyState/index.tsx`
- `src/components/list/ListPagination/index.tsx`
- `src/locales/en/list.json`, `src/locales/vi/list.json`
- `src/constants/list.ts` — `ALL_VALUE`, query-param key constants, date presets.
- `src/utils/listDateRange.ts` — `computeDateRange(preset)` + `DATE_RANGE_PRESETS`.

**Sửa:**
- `src/hooks/index.ts` — export `useListQuery`.
- `src/constants/index.ts` — add `LIST`.
- `src/locales/en/index.ts`, `src/locales/vi/index.ts` — register `list` namespace.
- Mỗi trang migrate (Phase 1): các view/toolbar/table/filters tương ứng + `dataSources/<Feature>` (thêm filterDefs).

**Xoá (sau migrate):**
- `src/views/AdminContact/components/{CategoryFilter,EmailFilter,FromDateFilter,SearchFilter,StatusFilter,TicketNumberFilter,ToDateFilter}/` — thay bằng declarative config.

---

# Phase 0 — Foundation

### Task 1 (FS): Shared list types

**Files:**
- Create: `src/types/List/index.ts`

- [ ] **Step 1: Tạo file types**

```ts
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
  search: string;
  filters: Record<string, string>;
  page: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  activeFilterCount: number;
  setSearch: (value: string) => void;
  setFilter: (key: string, value: string) => void;
  setDateRange: (preset: string, fromDate?: string, toDate?: string) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
}
```

- [ ] **Step 2: Verify** — `cd client && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(list): add shared list filter/query types"`

---

### Task 2 (FE): List constants + date-range util

**Files:**
- Create: `src/constants/list.ts`, `src/utils/listDateRange.ts`
- Modify: `src/constants/index.ts`, `src/utils/index.ts` (nếu có barrel; nếu không, export trực tiếp)

- [ ] **Step 1: `src/constants/list.ts`**

```ts
const LIST = {
  ALL_VALUE: "__all",
  PARAM: {
    SEARCH: "search",
    PAGE: "page",
    SORT_BY: "sortBy",
    SORT_ORDER: "sortOrder",
    DATE_RANGE: "dateRange",
    FROM_DATE: "fromDate",
    TO_DATE: "toDate"
  },
  DATE_PRESETS: ["all", "today", "last7", "last30", "last90", "custom"] as const,
  SEARCH_DEBOUNCE_MS: 300
} as const;

export default LIST;
```

- [ ] **Step 2: Thêm vào `src/constants/index.ts`**

```ts
import LIST from "./list";
// ... trong object CONSTANTS, thêm:  LIST,
```

- [ ] **Step 3: `src/utils/listDateRange.ts`**

```ts
import LIST from "@/constants/list";

export type DateRangePreset = (typeof LIST.DATE_PRESETS)[number];

const toIso = (d: Date) => d.toISOString().slice(0, 10);

export const computeDateRange = (
  preset: DateRangePreset
): { fromDate?: string; toDate?: string } => {
  if (preset === "all" || preset === "custom") return {};
  const now = new Date();
  const to = toIso(now);
  const days = preset === "today" ? 0 : preset === "last7" ? 6 : preset === "last30" ? 29 : 89;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { fromDate: toIso(from), toDate: to };
};
```

- [ ] **Step 4: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(list): add list constants and date-range util"`

---

### Task 3 (FE): i18n `list` shared namespace

**Files:**
- Create: `src/locales/en/list.json`, `src/locales/vi/list.json`
- Modify: `src/locales/en/index.ts`, `src/locales/vi/index.ts`

- [ ] **Step 1: `src/locales/en/list.json`**

```json
{
  "search": "Search",
  "searchPlaceholder": "Search…",
  "filters": "Filters",
  "clearAll": "Clear all",
  "clearFilters": "Clear filters",
  "all": "All",
  "noResultsTitle": "No results found",
  "noResultsDescription": "Try a different search or clear your filters.",
  "emptyTitle": "Nothing here yet",
  "viewGrid": "Grid view",
  "viewList": "List view",
  "pagination": { "page": "Page", "of": "of", "results": "results" },
  "dateRange": {
    "label": "Date range",
    "all": "All time",
    "today": "Today",
    "last7": "Last 7 days",
    "last30": "Last 30 days",
    "last90": "Last 90 days",
    "custom": "Custom",
    "from": "From",
    "to": "To"
  },
  "announce": {
    "filtersApplied": "Filters applied.",
    "filtersCleared": "Filters cleared.",
    "pageChanged": "Navigating to page {page}",
    "resultsLoaded": "{total} results loaded"
  }
}
```

- [ ] **Step 2: `src/locales/vi/list.json`**

```json
{
  "search": "Tìm kiếm",
  "searchPlaceholder": "Tìm kiếm…",
  "filters": "Bộ lọc",
  "clearAll": "Xóa tất cả",
  "clearFilters": "Xóa bộ lọc",
  "all": "Tất cả",
  "noResultsTitle": "Không tìm thấy kết quả",
  "noResultsDescription": "Thử từ khóa khác hoặc xóa bộ lọc.",
  "emptyTitle": "Chưa có gì ở đây",
  "viewGrid": "Dạng lưới",
  "viewList": "Dạng danh sách",
  "pagination": { "page": "Trang", "of": "trên", "results": "kết quả" },
  "dateRange": {
    "label": "Khoảng thời gian",
    "all": "Tất cả",
    "today": "Hôm nay",
    "last7": "7 ngày qua",
    "last30": "30 ngày qua",
    "last90": "90 ngày qua",
    "custom": "Tùy chỉnh",
    "from": "Từ",
    "to": "Đến"
  },
  "announce": {
    "filtersApplied": "Đã áp dụng bộ lọc.",
    "filtersCleared": "Đã xóa bộ lọc.",
    "pageChanged": "Chuyển đến trang {page}",
    "resultsLoaded": "Đã tải {total} kết quả"
  }
}
```

- [ ] **Step 3: Đăng ký namespace** — trong `src/locales/en/index.ts` và `vi/index.ts`, import `list.json` và thêm `list` vào object messages (theo đúng pattern các namespace hiện có — mỗi key = tên file).

- [ ] **Step 4: Verify** — `cd client && npx tsc --noEmit` → PASS (JSON imports typed).
- [ ] **Step 5: Commit** — `git commit -m "feat(list): add shared list i18n namespace (en+vi)"`

---

### Task 4 (FE): `useListQuery` hook

**Files:**
- Create: `src/hooks/useListQuery.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Tạo hook**

```ts
"use client";

// libs
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
// types
import type { ListFilterDef, ListQueryState } from "@/types/List";
// hooks
import { useAnnounce, useDebouncedValue } from "@/hooks";
// others
import { useRouter, usePathname } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

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
  const sortOrder = sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : undefined;

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
      if (def.type === "select" && !def.options.some((o) => o.value === v)) continue;
      out[def.key] = v;
    }
    return out;
  }, [searchParams, filterDefs]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    for (const def of filterDefs) {
      if (def.type === "dateRange") {
        if (filters[LIST.PARAM.FROM_DATE] || filters[LIST.PARAM.TO_DATE] || filters[LIST.PARAM.DATE_RANGE]) n += 1;
      } else if (filters[def.key]) {
        n += 1;
      }
    }
    return n;
  }, [filters, filterDefs]);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, LIST.SEARCH_DEBOUNCE_MS);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    (by: string, order: "asc" | "desc") => {
      push((p) => {
        p.set(LIST.PARAM.SORT_BY, by);
        p.set(LIST.PARAM.SORT_ORDER, order);
      }, false);
    },
    [push]
  );

  return {
    search: searchInput,
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
```

> **Implementer note:** the search-push `useEffect` intentionally depends only on `debouncedSearch` (guarded by `lastPushedSearch` ref to avoid loops). Keep the eslint-disable line. `filterDefs` should be a stable reference from `dataSources` (module-level const) so `useMemo` deps don't thrash — pages MUST pass a module-level constant, not an inline array.

- [ ] **Step 2: Export trong `src/hooks/index.ts`** — thêm `export { default as useListQuery } from "./useListQuery";`

- [ ] **Step 3: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "feat(list): add useListQuery URL-state hook"`

---

### Task 5 (FE): `DateRangeFilter` component

**Files:**
- Create: `src/components/list/DateRangeFilter/index.tsx`

- [ ] **Step 1: Tạo component**

```tsx
"use client";

// libs
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
// others
import { computeDateRange, type DateRangePreset } from "@/utils/listDateRange";
import CONSTANTS from "@/constants";

const { LIST } = CONSTANTS;

const DateRangeFilter = ({
  value,
  onChange
}: {
  value: string;
  onChange: (preset: string, fromDate?: string, toDate?: string) => void;
}) => {
  const t = useTranslations("list.dateRange");
  const current = (value || "all") as DateRangePreset;

  const handleChange = (preset: string) => {
    const { fromDate, toDate } = computeDateRange(preset as DateRangePreset);
    onChange(preset, fromDate, toDate);
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <CustomSelectTrigger aria-label={t("label")}>
        <SelectValue />
      </CustomSelectTrigger>
      <SelectContent>
        {LIST.DATE_PRESETS.filter((p) => p !== "custom").map((preset) => (
          <SelectItem key={preset} value={preset}>
            {t(preset)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default DateRangeFilter;
```

> **YAGNI:** "custom" (from/to inputs) deferred — current pages only use presets. Khi 1 trang thực sự cần custom from/to, mở lại preset "custom" + render 2 `<CustomDateInput>` (đã có pattern ở FromDateFilter cũ). Ghi defer này vào e2e.md. `ChevronDown` import giữ cho lần mở rộng; nếu lint báo unused thì bỏ.

- [ ] **Step 2: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(list): add DateRangeFilter (preset)"`

---

### Task 6 (FE): `ListFilterPanel` component

**Files:**
- Create: `src/components/list/ListFilterPanel/index.tsx`

- [ ] **Step 1: Tạo component** (render filterDefs + Clear all)

```tsx
"use client";

// libs
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { ListFilterDef, ListQueryState } from "@/types/List";
// components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
import DateRangeFilter from "../DateRangeFilter";
// constants
import CONSTANTS from "@/constants";

const { LIST } = CONSTANTS;

const ListFilterPanel = ({
  filterDefs,
  query
}: {
  filterDefs: ListFilterDef[];
  query: ListQueryState;
}) => {
  const t = useTranslations("list");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t("filters")}</span>
        {query.activeFilterCount > 0 && (
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            iconLeft={<X className="size-3.5" />}
            onClick={query.clearFilters}
          >
            {t("clearAll")}
          </CustomButton>
        )}
      </div>
      {filterDefs.map((def) => (
        <div key={def.key} className="flex flex-col gap-1.5">
          <Label className="text-xs">{def.label}</Label>
          {def.type === "select" && (
            <Select
              value={query.filters[def.key] || LIST.ALL_VALUE}
              onValueChange={(v) =>
                query.setFilter(def.key, v === LIST.ALL_VALUE ? "" : v)
              }
            >
              <CustomSelectTrigger>
                <SelectValue placeholder={def.allLabel ?? t("all")} />
              </CustomSelectTrigger>
              <SelectContent>
                <SelectItem value={LIST.ALL_VALUE}>
                  {def.allLabel ?? t("all")}
                </SelectItem>
                {def.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {def.type === "text" && (
            <CustomInput
              value={query.filters[def.key] ?? ""}
              onChange={(e) => query.setFilter(def.key, e.target.value)}
              placeholder={def.placeholder}
            />
          )}
          {def.type === "dateRange" && (
            <DateRangeFilter
              value={query.filters[LIST.PARAM.DATE_RANGE] ?? ""}
              onChange={query.setDateRange}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ListFilterPanel;
```

> **Note text filter:** `setFilter` (qua `push`) ghi URL ngay mỗi keystroke. Nếu trang có text filter "nặng" (email), implementer có thể bọc debounce cục bộ; mặc định giữ tức thì cho đơn giản. Hiện chỉ Admin Contact dùng text filter (email, ticketNumber).

- [ ] **Step 2: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(list): add ListFilterPanel (declarative)"`

---

### Task 7 (FE): `ListToolbar` component

**Files:**
- Create: `src/components/list/ListToolbar/index.tsx`

- [ ] **Step 1: Tạo component** (search trái + Filters popover phải + slot)

```tsx
"use client";

// libs
import { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { ListFilterDef, ListQueryState } from "@/types/List";
// components
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import CustomButton from "@/components/CustomButton";
import SearchInput from "@/components/SearchInput";
import ListFilterPanel from "../ListFilterPanel";

const ListToolbar = ({
  query,
  filterDefs = [],
  searchPlaceholder,
  rightSlot
}: {
  query: ListQueryState;
  filterDefs?: ListFilterDef[];
  searchPlaceholder?: string;
  rightSlot?: ReactNode;
}) => {
  const t = useTranslations("list");

  return (
    <div
      role="search"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <SearchInput
        value={query.search}
        onChange={query.setSearch}
        placeholder={searchPlaceholder ?? t("searchPlaceholder")}
        ariaLabel={t("search")}
        className="w-full sm:w-80"
        inputClassName="!h-10"
      />
      <div className="flex items-center gap-2">
        {rightSlot}
        {filterDefs.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <CustomButton
                type="button"
                variant="outline"
                iconLeft={<SlidersHorizontal className="size-4" />}
              >
                {t("filters")}
                {query.activeFilterCount > 0 && (
                  <span className="bg-primary text-primary-foreground ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
                    {query.activeFilterCount}
                  </span>
                )}
              </CustomButton>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <ListFilterPanel filterDefs={filterDefs} query={query} />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default ListToolbar;
```

- [ ] **Step 2: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(list): add ListToolbar (search + filters popover)"`

---

### Task 8 (FE): `ListPagination` component

**Files:**
- Create: `src/components/list/ListPagination/index.tsx`

- [ ] **Step 1: Tạo component** (wrap CustomPagination + page info, dùng namespace `list`)

```tsx
"use client";

// libs
import { useTranslations } from "next-intl";
// components
import CustomPagination from "@/components/CustomPagination";
import { Spinner } from "@/components/ui/spinner";

const ListPagination = ({
  page,
  totalPages,
  total,
  onPageChange,
  loading = false
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}) => {
  const t = useTranslations("list.pagination");
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        {loading && <Spinner className="size-3.5" aria-hidden="true" />}
        <span>
          {t("page")} {page} {t("of")} {totalPages} · {total} {t("results")}
        </span>
      </p>
      <CustomPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};

export default ListPagination;
```

> Thay thế `TablePagination` cho list pages mới (dùng namespace `list` chung thay vì labels từng trang). `TablePagination` cũ giữ nguyên cho tới khi mọi trang migrate xong (Task 22 cân nhắc xoá nếu không còn ai dùng).

- [ ] **Step 2: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(list): add ListPagination"`

---

### Task 9 (FE): `ListEmptyState` component

**Files:**
- Create: `src/components/list/ListEmptyState/index.tsx`

- [ ] **Step 1: Tạo component**

```tsx
"use client";

// libs
import { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";

const ListEmptyState = ({
  hasActiveFilters,
  onClearFilters,
  title,
  description,
  icon,
  action
}: {
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) => {
  const t = useTranslations("list");
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        {icon ?? <SearchX className="text-muted-foreground size-6" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-semibold">
        {title ?? (hasActiveFilters ? t("noResultsTitle") : t("emptyTitle"))}
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm">
        {description ?? t("noResultsDescription")}
      </p>
      {hasActiveFilters && onClearFilters ? (
        <CustomButton type="button" variant="outline" onClick={onClearFilters}>
          {t("clearFilters")}
        </CustomButton>
      ) : (
        action
      )}
    </div>
  );
};

export default ListEmptyState;
```

- [ ] **Step 2: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(list): add ListEmptyState"`

---

### Task 10 (FE): `ListContent` component

**Files:**
- Create: `src/components/list/ListContent/index.tsx`

- [ ] **Step 1: Tạo component** (loading/empty/data switch)

```tsx
"use client";

// libs
import { ReactNode } from "react";
// components
import ListEmptyState from "../ListEmptyState";

const ListContent = ({
  isLoading,
  isEmpty,
  hasActiveFilters,
  onClearFilters,
  skeleton,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  children
}: {
  isLoading: boolean;
  isEmpty: boolean;
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
  skeleton: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  children: ReactNode;
}) => {
  if (isLoading) return <>{skeleton}</>;
  if (isEmpty)
    return (
      <ListEmptyState
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  return <>{children}</>;
};

export default ListContent;
```

- [ ] **Step 2: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(list): add ListContent (loading/empty/data)"`

---

### Task 11 (FE): `ListPageHeader` + `ListPageShell`

**Files:**
- Create: `src/components/list/ListPageHeader/index.tsx`, `src/components/list/ListPageShell/index.tsx`

- [ ] **Step 1: `ListPageHeader`** (title + description + action slot). Dùng `<PageTitle>` đã có.

```tsx
// libs
import { ReactNode } from "react";
// components
import PageTitle from "@/components/PageTitle";

const ListPageHeader = ({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex flex-col gap-1.5">
      <PageTitle>{title}</PageTitle>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
    {action}
  </div>
);

export default ListPageHeader;
```

> **Implementer note:** xác nhận `@/components/PageTitle` tồn tại (frontend-reference §2 liệt kê `<PageTitle>` render `h1 text-2xl font-bold`). Nếu path khác, dùng đúng path component PageTitle hiện có. KHÔNG tạo heading thủ công.

- [ ] **Step 2: `ListPageShell`** (page-root rhythm `flex flex-col gap-6`)

```tsx
// libs
import { ReactNode } from "react";

const ListPageShell = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-6">{children}</div>
);

export default ListPageShell;
```

- [ ] **Step 3: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "feat(list): add ListPageShell and ListPageHeader"`

---

# Phase 1 — Page migrations

> **Migration pattern chung (mọi trang server-side áp dụng):**
> 1. Khai báo `<FEATURE>_FILTER_DEFS: ListFilterDef[]` (module-level const) trong `dataSources/<Feature>/` — options lấy từ i18n qua một factory `buildFilterDefs(t)` HOẶC giữ label key rồi map. **Vì options cần label dịch**, dùng factory nhận `t` và memo bằng `useMemo` trên `[t]` ở view (xem Admin Users mẫu).
> 2. View dùng `const query = useListQuery(filterDefs)`.
> 3. Build query params cho React Query từ `query.filters` + **`query.appliedSearch`** (giá trị search đã debounce/đẩy URL — KHÔNG dùng `query.search` vì đó là giá trị live, sẽ refetch mỗi keystroke) + `query.page` + `query.sortBy/Order`. `query.search` chỉ để bind vào ô SearchInput.
> 4. Render `ListPageShell > ListPageHeader + ListToolbar + ListContent(...) + ListPagination`.
> 5. Bỏ toolbar/filter cũ; bỏ khai báo `ALL_VALUE` cục bộ (dùng `CONSTANTS.LIST.ALL_VALUE`).

### Task 12 (FE): Migrate Admin Users (canonical)

**Files:**
- Create: `src/dataSources/AdminUsers/index.ts`
- Modify: `src/views/AdminUsers/mains/AdminUsersTable/index.tsx`
- Delete: `src/views/AdminUsers/mains/AdminUsersToolbar/index.tsx`, `src/views/AdminUsers/mains/AdminUsersHeader/index.tsx` (gộp vào shell — xác nhận nội dung header trước khi xoá; nếu header có logic khác thì giữ và bọc trong shell)
- Modify: `src/views/AdminUsers/index.tsx`

- [ ] **Step 1: `src/dataSources/AdminUsers/index.ts`** — filter def factory

```ts
// types
import type { ListFilterDef } from "@/types/List";

export const buildAdminUsersFilterDefs = (
  tRole: (k: string) => string,
  tStatus: (k: string) => string,
  tToolbar: (k: string) => string
): ListFilterDef[] => [
  {
    key: "role",
    type: "select",
    label: tToolbar("role"),
    options: [
      { value: "user", label: tRole("user") },
      { value: "admin", label: tRole("admin") }
    ]
  },
  {
    key: "status",
    type: "select",
    label: tToolbar("status"),
    options: [
      { value: "active", label: tStatus("active") },
      { value: "locked", label: tStatus("locked") }
    ]
  }
];
```

- [ ] **Step 2: Rewrite `AdminUsersTable/index.tsx`** — dùng shell + useListQuery. (Giữ nguyên dialog/row-actions/badge; chỉ đổi tầng list.)

```tsx
"use client";

// libs
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
// types
import type {
  AdminUser,
  AdminUsersQueryParams,
  AdminUserStatusFilter
} from "@/types/AdminUsers";
import type { AuthenticationRole } from "@/types/User";
// components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import ListPageShell from "@/components/list/ListPageShell";
import ListPageHeader from "@/components/list/ListPageHeader";
import ListToolbar from "@/components/list/ListToolbar";
import ListContent from "@/components/list/ListContent";
import ListPagination from "@/components/list/ListPagination";
import UserRoleBadge from "../../components/UserRoleBadge";
import UserStatusBadge from "../../components/UserStatusBadge";
import UserRowActions from "../../components/UserRowActions";
import UsersTableSkeleton from "../../components/UsersTableSkeleton";
import AdminUsersResetPasswordDialog from "../AdminUsersResetPasswordDialog";
import AdminUsersLockDialog from "../AdminUsersLockDialog";
import AdminUsersForceLogoutDialog from "../AdminUsersForceLogoutDialog";
// hooks
import { useListQuery } from "@/hooks";
import useAdminUsersList from "../../hooks/useAdminUsersList";
// dataSources
import { buildAdminUsersFilterDefs } from "@/dataSources/AdminUsers";
// others
import { formatDateTimeShort } from "@/utils";
import CONSTANTS from "@/constants";

const { LIST, AUTHENTICATION_ROLES } = CONSTANTS;
const TABLE_COLUMN_COUNT = 6;

const isRole = (v: unknown): v is AuthenticationRole =>
  v === AUTHENTICATION_ROLES.USER || v === AUTHENTICATION_ROLES.ADMIN;
const isStatus = (v: unknown): v is AdminUserStatusFilter =>
  v === "active" || v === "locked";

const AdminUsersTable = () => {
  const t = useTranslations("adminUsers");
  const tTable = useTranslations("adminUsers.table");
  const tToolbar = useTranslations("adminUsers.toolbar");
  const tRole = useTranslations("adminUsers.role");
  const tStatus = useTranslations("adminUsers.status");

  const filterDefs = useMemo(
    () => buildAdminUsersFilterDefs(tRole, tStatus, tToolbar),
    [tRole, tStatus, tToolbar]
  );
  const query = useListQuery(filterDefs);

  const params: AdminUsersQueryParams = {
    page: query.page,
    ...(query.appliedSearch && { search: query.appliedSearch }),
    ...(isRole(query.filters.role) && { role: query.filters.role }),
    ...(isStatus(query.filters.status) && { status: query.filters.status })
  };

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [forceLogoutTarget, setForceLogoutTarget] = useState<AdminUser | null>(null);

  const { data, isLoading } = useAdminUsersList(params);
  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <ListPageShell>
      <ListPageHeader title={t("title")} description={t("description")} />
      <ListToolbar
        query={query}
        filterDefs={filterDefs}
        searchPlaceholder={tToolbar("searchPlaceholder")}
      />
      <ListContent
        isLoading={isLoading}
        isEmpty={items.length === 0}
        hasActiveFilters={query.activeFilterCount > 0 || Boolean(query.search)}
        onClearFilters={query.clearFilters}
      >
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tTable("user")}</TableHead>
                <TableHead>{tTable("role")}</TableHead>
                <TableHead>{tTable("status")}</TableHead>
                <TableHead>{tTable("lastLoginAt")}</TableHead>
                <TableHead>{tTable("createdAt")}</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">{tTable("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium">{user.fullName}</span>
                      <span className="text-muted-foreground text-xs">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell><UserRoleBadge role={user.role} /></TableCell>
                  <TableCell><UserStatusBadge isActive={user.isActive} /></TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {user.lastLoginAt ? formatDateTimeShort(user.lastLoginAt) : tTable("neverLoggedIn")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateTimeShort(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRowActions
                      user={user}
                      onResetPassword={setResetTarget}
                      onLockToggle={setLockTarget}
                      onForceLogout={setForceLogoutTarget}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListContent>
      <ListPagination
        page={meta?.page ?? query.page}
        totalPages={meta?.totalPages ?? 1}
        total={meta?.total ?? 0}
        onPageChange={query.setPage}
        loading={isLoading}
      />
      <AdminUsersResetPasswordDialog target={resetTarget} onClose={() => setResetTarget(null)} />
      <AdminUsersLockDialog target={lockTarget} onClose={() => setLockTarget(null)} />
      <AdminUsersForceLogoutDialog target={forceLogoutTarget} onClose={() => setForceLogoutTarget(null)} />
    </ListPageShell>
  );
};

export default AdminUsersTable;
```

- [ ] **Step 3: `AdminUsers/index.tsx`** — view chỉ render table (table giờ tự bọc shell)

```tsx
import AdminUsersTable from "./mains/AdminUsersTable";

const AdminUsers = () => <AdminUsersTable />;

export default AdminUsers;
```

- [ ] **Step 4: Xoá** `AdminUsersToolbar/` và `AdminUsersHeader/` (sau khi xác nhận header không có logic khác). `TABLE_COLUMN_COUNT` không còn dùng cho empty row → có thể bỏ; giữ nếu lint không phàn nàn.
- [ ] **Step 5: i18n** — đảm bảo `adminUsers.toolbar.searchPlaceholder/role/status`, `adminUsers.role.*`, `adminUsers.status.*` còn tồn tại (đã có). Empty title/description giờ lấy từ namespace `list` (generic) — nếu muốn message riêng "No users found", truyền `emptyTitle={tTable("empty")}`/`emptyDescription` vào `ListContent`.
- [ ] **Step 6: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS. Manual: mở `/admin/users`, gõ search → URL `?search=` đổi sau 300ms; mở Filters → đổi role → URL `?role=` + page reset 1; clear → URL sạch.
- [ ] **Step 7: Commit** — `git commit -m "refactor(admin-users): migrate to unified list shell"`

---

### Task 13 (FE): Migrate Admin Apps

**Files:**
- Modify: `src/dataSources/AdminApps/index.ts` (thêm filter def factory), `src/views/AdminApps/mains/AdminAppsToolbar/index.tsx` (xoá), `src/views/AdminApps/mains/AdminAppsTable/index.tsx`, `src/views/AdminApps/index.tsx`.

- [ ] **Step 1: filterDefs** — status (từ `APP_STATUSES`) + category (load động qua React Query trong view, map sang `options`). Vì category async, build defs trong view bằng `useMemo` phụ thuộc `[categories, t]`. Thêm vào `dataSources/AdminApps`:

```ts
// types
import type { ListFilterDef, ListFilterOption } from "@/types/List";

export const buildAdminAppsFilterDefs = (
  statusOptions: ListFilterOption[],
  categoryOptions: ListFilterOption[],
  labels: { status: string; category: string }
): ListFilterDef[] => [
  { key: "status", type: "select", label: labels.status, options: statusOptions },
  { key: "category", type: "select", label: labels.category, options: categoryOptions }
];
```

- [ ] **Step 2: Rewrite `AdminAppsTable`** theo pattern Task 12: `useListQuery(filterDefs)`, build params, render shell + table. Category options từ `useQuery` categories hiện có (giữ nguyên hook đó), map `{value:id,label:name}`. Status options từ `APP_STATUSES.map(s => ({value:s,label:tStatus(s)}))`.
- [ ] **Step 3: `AdminApps/index.tsx`** render table. Xoá `AdminAppsToolbar`.
- [ ] **Step 4: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS. Manual: filter status/category đổi URL tức thì; pagination hiện (trước đây thiếu).
- [ ] **Step 5: Commit** — `git commit -m "refactor(admin-apps): migrate to unified list shell"`

---

### Task 14 (FE): Migrate Admin Contact (bỏ RHF + Apply)

**Files:**
- Modify: `src/dataSources/ContactAdmin/index.ts` (thêm filter def factory), `src/views/AdminContact/mains/AdminContactTable/index.tsx`, `src/views/AdminContact/index.tsx`
- Delete: `src/views/AdminContact/mains/AdminContactFilters/index.tsx` + `src/views/AdminContact/components/{CategoryFilter,EmailFilter,FromDateFilter,SearchFilter,StatusFilter,TicketNumberFilter,ToDateFilter}/`

- [ ] **Step 1: filterDefs factory** trong `dataSources/ContactAdmin`:

```ts
// types
import type { ListFilterDef } from "@/types/List";

export const buildAdminContactFilterDefs = (
  tStatus: (k: string) => string,
  tCategory: (k: string) => string,
  labels: { status: string; category: string; email: string; ticketNumber: string; dateRange: string; emailPh: string; ticketPh: string }
): ListFilterDef[] => [
  {
    key: "status",
    type: "select",
    label: labels.status,
    options: (["new", "processing", "resolved"] as const).map((s) => ({ value: s, label: tStatus(s) }))
  },
  {
    key: "category",
    type: "select",
    label: labels.category,
    options: CONTACT_CATEGORY_VALUES.map((c) => ({ value: c, label: tCategory(c) }))
  },
  { key: "email", type: "text", label: labels.email, placeholder: labels.emailPh },
  { key: "ticketNumber", type: "text", label: labels.ticketNumber, placeholder: labels.ticketPh },
  { key: "dateRange", type: "dateRange", label: labels.dateRange }
];
```

> `CONTACT_CATEGORY_VALUES` đã export sẵn trong file này. `priority` filter hiện không có UI → bỏ qua (YAGNI). `fromDate`/`toDate` giờ qua preset `dateRange`.

- [ ] **Step 2: Rewrite `AdminContactTable`** — bỏ `<AdminContactFilters>`, dùng `useListQuery(filterDefs)`. Build `AdminContactQuery` params: `{ page, ...(search), ...(status), ...(category), ...(email), ...(ticketNumber), ...(fromDate), ...(toDate) }` từ `query.filters`. Validate status/category bằng type-guard (giống isRole). Render shell + table + `ListPagination` (thay pagination inline cũ).
- [ ] **Step 3: `AdminContact/index.tsx`** render table.
- [ ] **Step 4: Xoá** `AdminContactFilters/` + 7 filter component. Kiểm tra không còn import nào tới chúng (`grep`). `AdminContactFilterFormValues` type + field-name group `ADMIN_CONTACT_FILTER_FIELD_NAMES` không còn dùng → xoá khỏi types/constants nếu không ai import.
- [ ] **Step 5: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS. Manual: đổi status → URL đổi tức thì + page reset (trước cần bấm Apply); date preset "Last 30 days" → set `dateRange/fromDate/toDate`.
- [ ] **Step 6: Commit** — `git commit -m "refactor(admin-contact): replace RHF filters with unified instant filters"`

---

### Task 15 (FE): Migrate Admin Login History

**Files:**
- Modify: `src/dataSources/LoginHistory/index.ts` (filter defs), `src/views/.../AdminLoginHistory*` table + filters, view index.

- [ ] **Step 1: filterDefs** — status (select), method (select), `dateRange` (preset — thay `computeDateRange` cũ của trang này). Lấy options từ dataSources `LoginHistory` (method colors đã có; thêm value list).
- [ ] **Step 2: Rewrite table** theo pattern; bỏ DropdownMenu filter cũ + `applyDateRange` cục bộ (giờ `query.setDateRange`). Dùng `ListPagination`.
- [ ] **Step 3: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "refactor(admin-login-history): migrate to unified list shell"`

---

### Task 16 (FE): Migrate Dashboard Login History

**Files:**
- Modify: `src/views/LoginHistory/*` (table + filters), view index, reuse `dataSources/LoginHistory` defs từ Task 15.

- [ ] **Step 1:** Dùng cùng filterDefs (status/method/dateRange). Trang này không có search (theo khảo sát) → vẫn render `ListToolbar` nhưng search vẫn dùng được (nếu BE hỗ trợ); nếu BE không hỗ trợ search cho endpoint này thì truyền `filterDefs` nhưng ẩn search bằng cách… **giữ search** (vô hại, BE bỏ qua param lạ) HOẶC thêm prop `showSearch={false}` vào `ListToolbar`. **Quyết định:** thêm optional `showSearch?: boolean` (default true) vào `ListToolbar` để trang không search ẩn ô search. Cập nhật Task 7 component nếu cần (thêm prop, render search có điều kiện).
- [ ] **Step 2: Rewrite** table + `ListPagination`.
- [ ] **Step 3: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "refactor(login-history): migrate to unified list shell"`

---

### Task 17 (FE): Migrate Admin Entitlements

**Files:**
- Modify: `src/views/AdminEntitlements/*` toolbar + table, view index.

- [ ] **Step 1:** Trang có user-picker (giữ nguyên — đây là context selector, không phải filter list chuẩn; để như slot trái hoặc giữ ngoài shell) + search app (client-side `useMemo`). Dùng `useListQuery([])` (không filterDefs, chỉ search) cho phần search → đọc `query.search`, lọc rows client-side bằng `useMemo` (như cũ). Render `ListToolbar` với `rightSlot`/hoặc user-picker phía trên. `userId` vẫn ghi URL như cũ.
- [ ] **Step 2:** Dùng `ListContent` cho empty/loading + `ListPagination` nếu áp dụng (entitlements có thể không phân trang → bỏ).
- [ ] **Step 3: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "refactor(admin-entitlements): adopt unified toolbar/search"`

---

### Task 18 (FE): Migrate Dashboard Apps (grid + view toggle slot)

**Files:**
- Modify: `src/dataSources/Dashboard/` hoặc `Apps` (filter defs cho category nếu dùng popover; HOẶC giữ category chips làm `rightSlot`), `src/views/Apps/mains/AppsBoard/index.tsx`, `src/views/Apps/index.tsx`.

- [ ] **Step 1:** Chuyển local state → URL: `const query = useListQuery(filterDefs)`. Search debounce giờ do hook lo (bỏ `useDebouncedValue` cục bộ + `useState search`). Category: theo mock đã duyệt, giữ là filter trong popover HOẶC chips. **Quyết định (theo mock §S4):** category vào popover (đồng nhất); view toggle (grid/list) là `rightSlot` của `ListToolbar`. `sort` (nếu có) → `query.setSort`.
- [ ] **Step 2:** View toggle: 1 component nhỏ (segmented 2 nút grid/list) đọc/ghi `view` param qua `searchParams` hoặc local (view là client-only preference — có thể giữ local state, KHÔNG cần URL). **Quyết định:** view = local `useState` (preference, không cần share); category/search/page = URL. Render grid trong `ListContent` (skeleton = grid skeleton hiện có). `ListPagination` cho phân trang apps.
- [ ] **Step 3: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS. Manual: search apps đẩy URL; category filter trong popover; toggle grid/list đổi layout.
- [ ] **Step 4: Commit** — `git commit -m "refactor(apps): migrate dashboard apps to unified list (URL state + grid)"`

---

### Task 19 (FE): Migrate Favorites (client-side)

**Files:**
- Modify: `src/views/Favorites/mains/FavoritesGrid/index.tsx`, `src/views/Favorites/index.tsx`.

- [ ] **Step 1:** `const query = useListQuery(filterDefs)` (category filter nếu có). Lọc `FAVORITE_APPS_MOCK` bằng `useMemo` trên `[query.search, query.filters]` (vẫn client-side, KHÔNG gọi API) — nhưng search/filter đọc từ URL (cùng concept). Page: nếu danh sách nhỏ, bỏ pagination; nếu cần, phân trang client-side.
- [ ] **Step 2:** Render `ListPageShell > ListPageHeader + ListToolbar + ListContent(grid) `. Empty state qua `ListContent`.
- [ ] **Step 3: Verify** — `cd client && yarn lint && npx tsc --noEmit` → PASS. Manual: search favorites đổi URL `?search=`; reload giữ filter.
- [ ] **Step 4: Commit** — `git commit -m "refactor(favorites): migrate to unified list (URL-driven client filter)"`

---

# Phase 2 — E2E (expand Scenario Matrix)

> Expand `## E2E Scenario Matrix` trong `design.md` thành test thực thi. Đại diện: **Admin Users** (server-side, multi-filter) + **Favorites** (client-side). Artifact: `client/e2e/unified-list/*.e2e.ts` + tài liệu `docs/specs/unified-list-experience/e2e.md`. Helper dùng chung `client/e2e/helpers/`; auth qua `auth.setup.ts` → storageState.

### Task 20 (FE): Author `e2e.md` + scaffold spec files

**Files:**
- Create: `docs/specs/unified-list-experience/e2e.md`, `client/e2e/unified-list/admin-users.e2e.ts`, `client/e2e/unified-list/favorites.e2e.ts`

- [ ] **Step 1: `e2e.md`** — copy bảng matrix từ `design.md`, thêm cột trạng thái + ghi case defer (vd `dateRange custom` deferred vì DateRangeFilter chưa làm custom; `sort toggle` chỉ test nếu trang có sort UI). Ghi `A only`: không có (read-heavy).
- [ ] **Step 2: Scaffold** 2 spec file với `test.describe` theo nhóm matrix (happy/authZ/validation-url/empty/boundary-pagination/filter-search/i18n/error-loading/a11y). Mỗi test 1 scenario.
- [ ] **Step 3: Commit** — `git commit -m "test(unified-list): author e2e scenarios doc + scaffolds"`

### Task 21 (FE): Implement E2E tests (Admin Users + Favorites)

- [ ] **Step 1:** Viết test theo matrix. Ví dụ test filter-search (Admin Users):

```ts
test("search persists in URL and filters results", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByRole("searchbox", { name: /search/i }).fill("olivia");
  await page.waitForURL(/search=olivia/);
  await expect(page).toHaveURL(/search=olivia/);
});

test("invalid role param is ignored (no crash)", async ({ page }) => {
  await page.goto("/admin/users?role=xyz&page=abc");
  await expect(page.getByRole("table")).toBeVisible();
  // page sanitized to 1, role dropped
});

test("changing filter resets page to 1", async ({ page }) => {
  await page.goto("/admin/users?page=3");
  await page.getByRole("button", { name: /filters/i }).click();
  await page.getByLabel(/role/i).click();
  await page.getByRole("option", { name: /admin/i }).click();
  await expect(page).toHaveURL(/page=1/);
});
```

- [ ] **Step 2: i18n en+vi** — lặp test render toolbar/empty ở cả `/admin/users` (en) và `/vi/admin/users` (vi); assert chuỗi "Filters"/"Bộ lọc".
- [ ] **Step 3: empty + clear** — search no-match → `ListEmptyState` hiện + nút Clear filters → click → URL sạch.
- [ ] **Step 4:** Chạy `cd client && yarn e2e unified-list` → PASS. (Tiền đề app-running theo §4.3 — agent self-check trước khi dispatch dual-gate.)
- [ ] **Step 5: Commit** — `git commit -m "test(unified-list): implement e2e for admin-users + favorites"`

---

# Phase 3 — Verify & finalize

### Task 22 (FE): Cleanup + green checks + drift audit

- [ ] **Step 1: Dead code** — `grep -r "AdminUsersToolbar\|AdminContactFilters\|TablePagination" client/src` xác nhận không còn import mồ côi. Xoá `TablePagination` nếu không trang nào dùng (nếu vẫn còn trang chưa migrate dùng, giữ). Bỏ `ALL_VALUE` cục bộ thừa, `AdminContactFilterFormValues`/`ADMIN_CONTACT_FILTER_FIELD_NAMES` nếu mồ côi.
- [ ] **Step 2: Green checks (§4.7)** — `cd client && yarn lint && yarn build` → xanh hết. Fix mọi lỗi.
- [ ] **Step 3: §4.3 E2E dual-gate** — self-check app running (BE:5000/FE:3000/Mongo/Redis); dispatch song song Gate A (`yarn e2e unified-list`) + Gate B (Playwright MCP walk matrix trên Admin Users + Favorites, auth context riêng). Cả 2 PASS mới qua. Fail → `systematic-debugging` → `e2e-bugs.md` → fix (max 3 vòng).
- [ ] **Step 4: CLAUDE.md drift audit (§4.6)** — chạy `claude-md-improver` trên `client/.claude/CLAUDE.md` (feature thêm pattern list shell + hook + namespace `list` + folder `components/list/`). Cập nhật Core Patterns/Custom* inventory nếu lệch. Đi kèm PR client.
- [ ] **Step 5: README sync (§4.8)** — feature không đổi setup/config/env/deps → **skip** readme-maintainer.
- [ ] **Step 6: Commit** — `git commit -m "chore(unified-list): cleanup dead code + claude.md sync"`

---

## Self-Review (đã chạy)

- **Spec coverage:** §2 quyết định (URL/instant/component+hook/preset/popover) → Task 1–11 (foundation) + 12–19 (8 trang). §3 kiến trúc → Task 4–11. §4 data flow → Task 4 (hook). §5 migration 8 trang → Task 12–19 (đủ 8). §6 edge (URL invalid/a11y/i18n) → Task 4 (validate+announce) + Phase 2. E2E Matrix → Task 20–21. Green checks/drift → Task 22.
- **Placeholder scan:** Foundation (Task 1–11) code đầy đủ. Migration Task 13/15/16/17/18/19 mô tả pattern + filterDefs + quyết định cụ thể, code đầy đủ ở canonical (Task 12 & 14); các trang còn lại theo đúng pattern Task 12 với config riêng đã nêu — **không** "TBD". Implementer đọc code thực tế từng trang khi thực thi (đường dẫn chính xác đã ghi).
- **Type consistency:** `ListQueryState` (Task 1) khớp return của `useListQuery` (Task 4) khớp props `ListToolbar`/`ListFilterPanel`/`ListContent` (Task 6–10). `CONSTANTS.LIST` (Task 2) dùng nhất quán. `computeDateRange`/`DateRangePreset` (Task 2) dùng ở Task 5.
- **Open decisions locked:** view toggle = local state (không URL); `ListToolbar` thêm `showSearch?` (Task 16) cho trang không search; category Apps vào popover; date custom deferred (ghi e2e.md).
