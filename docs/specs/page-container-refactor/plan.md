# PageContainer Refactor + CustomTable Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rename `components/list/` → `PageContainer/` (`List*`→`Page*`), extract a reusable `CustomTable`, and drop `ListPagination` in favor of `CustomPagination` — no behavior change.

**Architecture:** Pure FE refactor. Foundation first (types → utils → CustomTable → i18n), then rename folder, then update consumers (dataSources → views), then docs. Verify with `yarn lint` + `yarn build` (FE has no jest; `next build` type-checks).

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind 4, next-intl.

## Global Constraints

- Work in worktree `client/.worktrees/page-container-refactor` (branch `refactor/page-container`).
- Component props typed **inline** (no `type Props`). Shared types in `src/types/<Feature>/`.
- Imports grouped per `rules/imports.md`. Component = folder + `index.tsx`, single default export (`rules/component-folder.md`).
- No behavior change. Keep `useListQuery`, `ListQueryState`, i18n namespace `list`, `CONSTANTS.LIST`.
- Every touched string goes through i18n; no hardcoded copy.
- Verification per task: `cd client/.worktrees/page-container-refactor && npx tsc --noEmit` (scope) — full `yarn lint && yarn build` at Task 9.

---

### Task 0: Worktree deps (node_modules junction)

**Files:** none (env setup).

- [ ] **Step 1:** Ensure worktree can run tsc/lint/build by linking main's node_modules (worktree checkout has none).

```bash
# PowerShell (junction), from repo root — see memory reference_worktree_node_modules_junction
New-Item -ItemType Junction -Path "D:/Learn/web-app-store-server-client/client/.worktrees/page-container-refactor/node_modules" -Target "D:/Learn/web-app-store-server-client/client/node_modules"
```

- [ ] **Step 2:** Verify tsc runs.

Run: `cd "D:/Learn/web-app-store-server-client/client/.worktrees/page-container-refactor" && npx tsc --noEmit`
Expected: compiles (baseline may have 0 errors). If main node_modules incomplete → `cd client && yarn install` first.

---

### Task 1: Types — `@/types/CustomTable`, trim `@/types/List`

**Files:**
- Create: `src/types/CustomTable/index.ts`
- Modify: `src/types/List/index.ts`

**Produces:** `CustomTableColumn<T>`, `ColumnAlign`, `ColumnBreakpoint` from `@/types/CustomTable`. `@/types/List` keeps `SortOrder`, `ListQueryState`, `ListFilterDef`, `ListFilterOption`, `DateRangePreset`.

- [ ] **Step 1: Create `src/types/CustomTable/index.ts`**

```ts
// libs
import type { ReactNode } from "react";
// types
import type { COLUMN_BREAKPOINT } from "@/constants/list";

export type ColumnAlign = "left" | "center" | "right";

export type ColumnBreakpoint =
  (typeof COLUMN_BREAKPOINT)[keyof typeof COLUMN_BREAKPOINT];

export interface CustomTableColumn<T> {
  id: string;
  header: ReactNode;
  align?: ColumnAlign;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  srOnlyHeader?: boolean;
  sortable?: boolean;
  width?: string;
  hideBelow?: ColumnBreakpoint;
}
```

- [ ] **Step 2: Edit `src/types/List/index.ts`** — remove `ColumnBreakpoint` type, `ColumnAlign` type, `ListColumn` interface, and the now-unused `COLUMN_BREAKPOINT` import. Keep `SortOrder` (+ `SORT_ORDER` import), `DateRangePreset`, `ListFilterOption`, `ListFilterDef`, `ListQueryState`.

Resulting import line:
```ts
import type LIST from "@/constants/list";
import type { SORT_ORDER } from "@/constants/list";
```
Delete blocks: `export type ColumnBreakpoint = ...`, `export type ColumnAlign = ...`, `export interface ListColumn<T> { ... }`.

- [ ] **Step 3: Verify** `npx tsc --noEmit` — expect errors ONLY in files still importing `ListColumn`/`ColumnAlign`/`ColumnBreakpoint` from `@/types/List` (fixed in later tasks: utils, ListTable, dataSources). Note them; proceed.

- [ ] **Step 4: Commit** `git add src/types && git commit -m "refactor(types): add CustomTableColumn, trim List column types"`

---

### Task 2: utils — repoint `alignClass`/`hideBelowClass`

**Files:** Modify `src/utils/index.ts`

**Consumes:** `ColumnAlign`, `ColumnBreakpoint` from `@/types/CustomTable` (Task 1).

- [ ] **Step 1:** Change import (line ~16) from `import type { ColumnAlign, ColumnBreakpoint } from "@/types/List";` → `import type { ColumnAlign, ColumnBreakpoint } from "@/types/CustomTable";`
- [ ] **Step 2: Verify** `npx tsc --noEmit` — utils no longer errors on these types.
- [ ] **Step 3: Commit** `git add src/utils && git commit -m "refactor(utils): import column types from CustomTable"`

---

### Task 3: i18n — `common.table` defaults + trim `list.json`

**Files:** Modify `src/locales/en/common.json`, `src/locales/vi/common.json`, `src/locales/en/list.json`, `src/locales/vi/list.json`

- [ ] **Step 1:** Add to `common.json` (en) top-level:
```json
"table": {
  "sortBy": "Sort by {column}",
  "sortedAscending": "Sorted ascending.",
  "sortedDescending": "Sorted descending."
}
```
vi:
```json
"table": {
  "sortBy": "Sắp xếp theo {column}",
  "sortedAscending": "Đã sắp xếp tăng dần.",
  "sortedDescending": "Đã sắp xếp giảm dần."
}
```

- [ ] **Step 2:** In `list.json` (en + vi) **remove** keys: `sortBy`, `pagination`, `announce.sortedAsc`, `announce.sortedDesc`. Keep `announce.filtersApplied/filtersCleared/pageChanged` and everything else.

- [ ] **Step 3: Verify** `npx tsc --noEmit` (message types regenerate from JSON on build; tsc ok). Commit `git add src/locales && git commit -m "refactor(i18n): move table sort strings to common, drop list.pagination"`

---

### Task 4: `CustomTable` component (+ nested `SortHeader`)

**Files:**
- Create: `src/components/CustomTable/index.tsx`
- Create: `src/components/CustomTable/components/SortHeader/index.tsx`

**Consumes:** `CustomTableColumn`, `ColumnAlign`, `ColumnBreakpoint` (Task 1); `alignClass`, `hideBelowClass` (Task 2); `common.table` (Task 3); `SortOrder` from `@/types/List`.
**Produces:** default export `CustomTable<T>`.

- [ ] **Step 1: Create `SortHeader`** (port of `list/ListSortHeader`, unchanged logic):

```tsx
"use client";

// libs
import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
// types
import type { SortOrder } from "@/types/List";
// components
import CustomButton from "@/components/CustomButton";
// others
import { SORT_ORDER } from "@/constants/list";

const SortHeader = ({
  label,
  active,
  order,
  ariaLabel,
  onToggle
}: {
  label: ReactNode;
  active: boolean;
  order?: SortOrder;
  ariaLabel: string;
  onToggle: () => void;
}) => {
  const icon = !active ? (
    <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-60" />
  ) : order === SORT_ORDER.ASC ? (
    <ArrowUp aria-hidden="true" className="size-3.5" />
  ) : (
    <ArrowDown aria-hidden="true" className="size-3.5" />
  );

  return (
    <CustomButton
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      aria-label={ariaLabel}
      iconRight={icon}
      className="text-muted-foreground data-[active=true]:text-foreground -ml-2 gap-1.5 font-medium"
      data-active={active}
    >
      {label}
    </CustomButton>
  );
};

export default SortHeader;
```

- [ ] **Step 2: Create `CustomTable/index.tsx`** — port of `list/ListTable` with: `fullHeight` prop (folds `ListTableCard`), `CustomTableColumn`, `SortHeader` from `./components/SortHeader`, i18n default from `common.table` + optional prop overrides `sortByLabel`/`sortedAscLabel`/`sortedDescLabel`.

```tsx
"use client";

// libs
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
// types
import type { CustomTableColumn } from "@/types/CustomTable";
import type { SortOrder } from "@/types/List";
// components
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import SortHeader from "./components/SortHeader";
// hooks
import { useAnnounce } from "@/hooks";
// others
import { Link } from "@/i18n/navigation";
import { cn } from "@/libs/utils";
import { alignClass, hideBelowClass } from "@/utils";
import { SORT_ORDER } from "@/constants/list";

const CustomTable = <T,>({
  columns,
  rows,
  getRowKey,
  getRowHref,
  rowLabel,
  rowActions,
  actionsLabel,
  caption,
  sortBy,
  sortOrder,
  onSort,
  fullHeight = false,
  sortByLabel,
  sortedAscLabel,
  sortedDescLabel
}: {
  columns: CustomTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  getRowHref?: (row: T) => string;
  rowLabel?: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
  actionsLabel?: string;
  caption?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (id: string, order: SortOrder) => void;
  fullHeight?: boolean;
  sortByLabel?: (columnLabel: string) => string;
  sortedAscLabel?: string;
  sortedDescLabel?: string;
}) => {
  const tTable = useTranslations("common.table");
  const { announce } = useAnnounce();

  const resolveSortBy = (columnLabel: string) =>
    sortByLabel?.(columnLabel) ?? tTable("sortBy", { column: columnLabel });
  const ascText = sortedAscLabel ?? tTable("sortedAscending");
  const descText = sortedDescLabel ?? tTable("sortedDescending");

  const handleSort = (id: string) => {
    const isActive = sortBy === id;
    const nextOrder =
      isActive && sortOrder === SORT_ORDER.ASC
        ? SORT_ORDER.DESC
        : SORT_ORDER.ASC;
    onSort?.(id, nextOrder);
    announce(nextOrder === SORT_ORDER.ASC ? ascText : descText);
  };

  const isSortActive = (id: string) => sortBy === id && Boolean(sortOrder);

  const ariaSortFor = (col: CustomTableColumn<T>) => {
    if (!col.sortable) return undefined;
    if (!isSortActive(col.id)) return "none" as const;
    return sortOrder === SORT_ORDER.ASC
      ? ("ascending" as const)
      : ("descending" as const);
  };

  const table = (
    <Table containerClassName={fullHeight ? "md:h-full" : undefined}>
      {caption && <TableCaption className="sr-only">{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.id}
              scope="col"
              aria-sort={ariaSortFor(col)}
              style={col.width ? { width: col.width } : undefined}
              className={cn(
                alignClass(col.align),
                hideBelowClass(col.hideBelow),
                col.headerClassName
              )}
            >
              {col.sortable && onSort ? (
                <SortHeader
                  label={
                    col.srOnlyHeader ? (
                      <span className="sr-only">{col.header}</span>
                    ) : (
                      col.header
                    )
                  }
                  active={isSortActive(col.id)}
                  order={isSortActive(col.id) ? sortOrder : undefined}
                  ariaLabel={resolveSortBy(
                    typeof col.header === "string" ? col.header : col.id
                  )}
                  onToggle={() => handleSort(col.id)}
                />
              ) : col.srOnlyHeader ? (
                <span className="sr-only">{col.header}</span>
              ) : (
                col.header
              )}
            </TableHead>
          ))}
          {rowActions && (
            <TableHead scope="col" className="w-12 text-right">
              <span className="sr-only">{actionsLabel}</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={getRowKey(row)}
            className={cn("relative", getRowHref && "cursor-pointer")}
          >
            {columns.map((col, colIdx) => (
              <TableCell
                key={col.id}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  alignClass(col.align),
                  hideBelowClass(col.hideBelow),
                  col.cellClassName
                )}
              >
                {colIdx === 0 && getRowHref && (
                  <Link
                    href={getRowHref(row)}
                    aria-label={rowLabel?.(row)}
                    className="absolute inset-0 z-[1]"
                  />
                )}
                {col.cell(row)}
              </TableCell>
            ))}
            {rowActions && (
              <TableCell className="relative z-10 text-right">
                {rowActions(row)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (!fullHeight)
    return (
      <div className="bg-card overflow-hidden rounded-xl border">{table}</div>
    );

  return (
    <div className="bg-card [&_thead_th]:bg-card overflow-hidden rounded-xl border md:flex md:min-h-0 md:flex-col md:[&_thead_th]:sticky md:[&_thead_th]:top-0 md:[&_thead_th]:z-10">
      {table}
    </div>
  );
};

export default CustomTable;
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` — CustomTable compiles.
- [ ] **Step 4: Commit** `git add src/components/CustomTable && git commit -m "feat(CustomTable): reusable table with fullHeight opt-in"`

---

### Task 5: Rename `list/` → `PageContainer/` (+ remove extracted/deleted)

**Files:** rename folder `src/components/list/` → `src/components/PageContainer/`; within it rename 7 component folders + edit each `index.tsx` (component identifier + internal relative imports); delete `ListTable`, `ListTableCard`, `ListSortHeader`, `ListPagination`.

Rename map (folder + `const X =` + `export default X`):
`ListPageShell`→`PageShell`, `ListPageHeader`→`PageHeader`, `ListToolbar`→`PageToolbar`, `ListContent`→`PageContent`, `ListEmptyState`→`PageEmptyState`, `ListFilterPanel`→`PageFilterPanel`, `DateRangeFilter`→`PageDateRangeFilter`.

Internal import fixes:
- `PageContent/index.tsx`: `import ListEmptyState from "../ListEmptyState"` → `import PageEmptyState from "../PageEmptyState"` (+ usage).
- `PageToolbar/index.tsx`: `import ListFilterPanel from "../ListFilterPanel"` → `import PageFilterPanel from "../PageFilterPanel"` (+ usage).
- `PageFilterPanel/index.tsx`: `import DateRangeFilter from "../DateRangeFilter"` → `import PageDateRangeFilter from "../PageDateRangeFilter"` (+ usage).

- [ ] **Step 1:** `git mv src/components/list src/components/PageContainer`
- [ ] **Step 2:** For each of the 7: `git mv src/components/PageContainer/<Old> src/components/PageContainer/<New>`, then edit its `index.tsx` — rename the `const`/default-export identifier and fix internal imports above. (`PageToolbar` keeps `useTranslations("list")`; `PageDateRangeFilter` keeps `useTranslations("list.dateRange")`; `PageEmptyState` keeps `useTranslations("list")` — namespace unchanged.)
- [ ] **Step 3:** Delete `src/components/PageContainer/ListTable`, `ListTableCard`, `ListSortHeader`, `ListPagination` (`git rm -r`).
- [ ] **Step 4: Verify** `npx tsc --noEmit` — errors now only in consumers (views/dataSources importing old paths), fixed in Tasks 6-7.
- [ ] **Step 5: Commit** `git add -A src/components/PageContainer && git commit -m "refactor(PageContainer): rename list/ components List*->Page*, drop table/pagination"`

---

### Task 6: dataSources — `ListColumn` → `CustomTableColumn` (5 files)

**Files:** Modify `src/dataSources/{AdminApps,AdminEntitlements,AdminUsers,ContactAdmin,LoginHistory}/index.tsx`

- [ ] **Step 1:** In each, replace `import type { ListColumn } from "@/types/List"` → `import type { CustomTableColumn } from "@/types/CustomTable"` and every `ListColumn<X>` → `CustomTableColumn<X>` (builder return types). If a file imports both `ListColumn` and other List types, keep the other List import and add the CustomTable import.
- [ ] **Step 2: Verify** `npx tsc --noEmit` — dataSources clean.
- [ ] **Step 3: Commit** `git add src/dataSources && git commit -m "refactor(dataSources): column type CustomTableColumn"`

---

### Task 7: Views — imports + JSX (8 files)

**Files:** Modify (mains that build the list page):
- `src/views/AdminApps/mains/AdminAppsTable/index.tsx`
- `src/views/AdminUsers/mains/AdminUsersTable/index.tsx`
- `src/views/AdminContact/mains/AdminContactTable/index.tsx`
- `src/views/AdminEntitlements/mains/AdminEntitlementsTable/index.tsx`
- `src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`
- `src/views/LoginHistory/mains/LoginHistoryTable/index.tsx`
- `src/views/Favorites/mains/FavoritesGrid/index.tsx`
- `src/views/Apps/mains/AppsBoard/index.tsx`

Per file:
- [ ] **Step 1:** Import rewrites:
  - `@/components/list/ListPageShell` → `@/components/PageContainer/PageShell` (`ListPageShell`→`PageShell`)
  - `@/components/list/ListPageHeader` → `@/components/PageContainer/PageHeader`
  - `@/components/list/ListToolbar` → `@/components/PageContainer/PageToolbar`
  - `@/components/list/ListContent` → `@/components/PageContainer/PageContent`
  - `@/components/list/ListTable` → `@/components/CustomTable` (name `CustomTable`)
  - `@/components/list/ListPagination` → **remove**; add `import CustomPagination from "@/components/CustomPagination"` (if not present)
- [ ] **Step 2:** JSX rewrites: `<ListPageShell>`→`<PageShell>`, `<ListPageHeader>`→`<PageHeader>`, `<ListToolbar>`→`<PageToolbar>`, `<ListContent>`→`<PageContent>`, `<ListTable ...>`→`<CustomTable fullHeight ...>` (add `fullHeight` where the view uses `<ListContent fullHeight>`). Replace `<ListPagination page={query.page} totalPages={N} total={...} onPageChange={query.setPage} loading={isLoading} />` with `{N > 1 && (<CustomPagination page={query.page} totalPages={N} onPageChange={query.setPage} />)}` (use the same `totalPages` expression the view passed; drop `total`/`loading`). For views passing `totalPages={1}`, the guard renders nothing (same as before).
- [ ] **Step 3: Verify** `npx tsc --noEmit` after all 8 — clean.
- [ ] **Step 4: Commit** `git add src/views && git commit -m "refactor(views): use PageContainer + CustomTable + CustomPagination"`

---

### Task 8: CLAUDE.md drift (§4.6)

**Files:** Modify `client/.claude/CLAUDE.md` (⚠️ gitignored — edit takes effect locally but is NOT committed/PR'd; flag to user).

- [ ] **Step 1:** Update line ~76 (`src/components/list/`) → describe `src/components/PageContainer/` with new names (`PageShell, PageHeader, PageToolbar, PageContent, PageEmptyState, PageFilterPanel, PageDateRangeFilter`), note table via `@/components/CustomTable` (`fullHeight` opt-in) and pagination via `@/components/CustomPagination`.
- [ ] **Step 2:** Update line ~94 ("Unified list pages") shell chain `ListPageShell → ... → ListPagination` → `PageShell → PageHeader → PageToolbar → PageContent → CustomPagination`; column type `CustomTableColumn`.
- [ ] **Step 3:** No commit (gitignored). Note in final report.

---

### Task 9: Green checks + finish

- [ ] **Step 1:** `cd client/.worktrees/page-container-refactor && yarn lint` → fix any issues, re-run until clean.
- [ ] **Step 2:** `yarn build` → must succeed (type-check + missing-message check). Fix until green.
- [ ] **Step 3:** Confirm no leftover references: grep `components/list/` and `ListColumn` and `ListPagination` across `src/` → expect 0 (except intended `@/types/List` non-column exports).
- [ ] **Step 4:** Commit any lint autofixes. Proceed to finishing-a-development-branch → creating-github-pr (per-repo client + docs), squash-merge + cleanup worktrees.

## Self-Review

- **Spec coverage:** rename (T5), CustomTable+fullHeight+SortHeader (T4), CustomTableColumn type (T1), utils (T2), i18n common.table + trim list (T3), dataSources (T6), views incl pagination removal (T7), CLAUDE.md drift (T8), green checks (T9). All spec sections mapped.
- **Placeholders:** none — full code for new artifacts (types, CustomTable, SortHeader, i18n); rename maps exact.
- **Type consistency:** `CustomTableColumn<T>` used identically in T1/T4/T6; `SortOrder` from `@/types/List` in T4/SortHeader; `fullHeight` default `false` consistent.
