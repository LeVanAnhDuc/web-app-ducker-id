# List Table Column Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Thêm `sortable` / `width` / `hideBelow` cho `ListColumn` + controlled-sort (`sortBy`/`sortOrder`/`onSort`) cho `ListTable`, wire client-side sort vào AdminApps.

**Architecture:** Thuần FE. Surface hạ tầng sort có sẵn (`useListQuery`) lên `ListTable` theo pattern controlled (value+onChange). Sort AdminApps là client-side (bảng 1-trang) qua hook tái dùng `useClientSortedRows`. width = inline style; hideBelow = class Tailwind tĩnh; toggle 2-state.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 4, next-intl (en+vi), lucide-react, Playwright.

## Global Constraints (copy verbatim từ convention)

- **No magic string cho enum**: `hideBelow` derive type từ constant `COLUMN_BREAKPOINT` (`constants.md`). `width` là giá trị tự do → inline style OK.
- **UI có behavior phải dùng `CustomButton`**, không raw `<button>` (`components.md`).
- **Type props component viết INLINE** tại tham số; type dùng chung ở `src/types/` (`types.md`).
- **Icon qua icon-map.md** — tra trước khi thêm (`§3.2`). Sort=`ArrowUpDown`; thêm `ArrowUp`/`ArrowDown`.
- **Mọi string mới qua i18n** (en+vi), namespace `list.announce`.
- **`useAnnounce`** cho sort change (accessibility rule: Table/Grid → Sort column).
- **Import groups** theo `imports.md`; component 1 folder `index.tsx` 1 default export (`component-folder.md`).
- **FE verify**: không có unit jest — gate là `cd client && yarn lint && yarn build` (next build type-check) + E2E dual-gate (§4.3).

---

### Task 1: Constants + Types (`sortable`/`width`/`hideBelow`)

**Files:**
- Modify: `client/src/constants/list.ts`
- Modify: `client/src/types/List/index.ts`

**Interfaces:**
- Produces: `COLUMN_BREAKPOINT = { SM:"sm", MD:"md", LG:"lg" }`; `type ColumnBreakpoint`; `ListColumn<T>` với `sortable?`, `width?`, `hideBelow?`.

- [ ] **Step 1: Thêm constant** vào `client/src/constants/list.ts` (sau dòng `export const SORT_ORDER`):

```ts
export const COLUMN_BREAKPOINT = { SM: "sm", MD: "md", LG: "lg" } as const;
```

- [ ] **Step 2: Mở rộng type** `client/src/types/List/index.ts`. Thêm import + type derive + 3 key:

```ts
// đầu file, cùng nhóm import type từ constants
import type { COLUMN_BREAKPOINT } from "@/constants/list";

export type ColumnBreakpoint =
  (typeof COLUMN_BREAKPOINT)[keyof typeof COLUMN_BREAKPOINT];

export interface ListColumn<T> {
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

- [ ] **Step 3: Verify** `cd client && npx tsc --noEmit` → PASS (chưa consumer nào dùng → không lỗi).

---

### Task 2: `hideBelowClass` util

**Files:**
- Modify: `client/src/utils/index.ts` (cạnh `alignClass`, ~line 266)

**Interfaces:**
- Consumes: `ColumnBreakpoint` (Task 1), `COLUMN_BREAKPOINT`.
- Produces: `hideBelowClass(breakpoint?: ColumnBreakpoint): string`.

- [ ] **Step 1: Thêm import** ở đầu `utils/index.ts` (nếu chưa có `ColumnBreakpoint` trong nhóm type import từ `@/types/List`, thêm; import value `COLUMN_BREAKPOINT` từ `@/constants/list`).

- [ ] **Step 2: Thêm hàm** sau `alignClass`:

```ts
export const hideBelowClass = (breakpoint?: ColumnBreakpoint): string => {
  switch (breakpoint) {
    case COLUMN_BREAKPOINT.SM:
      return "hidden sm:table-cell";
    case COLUMN_BREAKPOINT.MD:
      return "hidden md:table-cell";
    case COLUMN_BREAKPOINT.LG:
      return "hidden lg:table-cell";
    default:
      return "";
  }
};
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` → PASS.

---

### Task 3: `useClientSortedRows` hook

**Files:**
- Create: `client/src/hooks/useClientSortedRows.ts`
- Modify: `client/src/hooks/index.ts` (barrel)

**Interfaces:**
- Consumes: `SortOrder` (`@/types/List`), `SORT_ORDER` (`@/constants/list`).
- Produces: `useClientSortedRows<T>(rows, sortBy, sortOrder, accessors): T[]`.

- [ ] **Step 1: Tạo hook** `client/src/hooks/useClientSortedRows.ts`:

```ts
// libs
import { useMemo } from "react";
// types
import type { SortOrder } from "@/types/List";
// others
import { SORT_ORDER } from "@/constants/list";

const useClientSortedRows = <T,>(
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
```

**Ràng buộc (comment trong file):** chỉ dùng cho bảng client-side (toàn bộ rows nằm 1 trang). KHÔNG dùng cho bảng server-paginated (sẽ chỉ sort trang hiện tại).

- [ ] **Step 2: Export barrel** — thêm dòng vào `client/src/hooks/index.ts`:

```ts
export { default as useClientSortedRows } from "./useClientSortedRows";
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` → PASS.

---

### Task 4: `ListSortHeader` component + icon-map + i18n

**Files:**
- Create: `client/src/components/list/ListSortHeader/index.tsx`
- Modify: `client/src/locales/en/list.json`, `client/src/locales/vi/list.json`
- (icon-map update deferred — `.claude` repo, follow-up; xem design.md §5)

**Interfaces:**
- Consumes: `SortOrder`, `SORT_ORDER`, `CustomButton`, lucide icons.
- Produces: `ListSortHeader` (default export) props inline `{ label: ReactNode; active: boolean; order?: SortOrder; ariaLabel: string; onToggle: () => void }`.

- [ ] **Step 1: Thêm i18n** — vào `announce` của `en/list.json`:

```json
"sortedAsc": "Sorted ascending.",
"sortedDesc": "Sorted descending."
```
và `vi/list.json`:
```json
"sortedAsc": "Đã sắp xếp tăng dần.",
"sortedDesc": "Đã sắp xếp giảm dần."
```
Thêm key `"sortBy": "Sort by {column}"` (en) / `"sortBy": "Sắp xếp theo {column}"` (vi) ở cấp gốc namespace `list` cho aria-label nút sort.

- [ ] **Step 2: (deferred)** icon-map (`ArrowUp`/`ArrowDown`) — follow-up ở repo `.claude`, không trong PR này.

- [ ] **Step 3: Tạo component** `client/src/components/list/ListSortHeader/index.tsx`:

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

const ListSortHeader = ({
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
      className="-ml-2 gap-1.5 font-medium data-[active=true]:text-foreground"
      data-active={active}
    >
      {label}
    </CustomButton>
  );
};

export default ListSortHeader;
```

- [ ] **Step 4: Verify** `npx tsc --noEmit` → PASS.

---

### Task 5: `ListTable` — sort props + width/hideBelow rendering

**Files:**
- Modify: `client/src/components/list/ListTable/index.tsx`

**Interfaces:**
- Consumes: `SortOrder`, `SORT_ORDER`, `hideBelowClass` (Task 2), `ListSortHeader` (Task 4), `useAnnounce`, `useTranslations`.
- Produces: `ListTable` với props mới `sortBy?`, `sortOrder?`, `onSort?`.

- [ ] **Step 1: Cập nhật** `ListTable/index.tsx` — thêm imports (nhóm đúng): `useTranslations` (libs), `SortOrder` (types), `ListSortHeader` (components), `useAnnounce` (hooks), `hideBelowClass` + `SORT_ORDER` (others). Thêm props + logic:

```tsx
const ListTable = <T,>({
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
  onSort
}: {
  columns: ListColumn<T>[];
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
}) => {
  const tList = useTranslations("list");
  const tAnnounce = useTranslations("list.announce");
  const { announce } = useAnnounce();

  const handleSort = (id: string) => {
    const isActive = sortBy === id;
    const nextOrder =
      isActive && sortOrder === SORT_ORDER.ASC
        ? SORT_ORDER.DESC
        : SORT_ORDER.ASC;
    onSort?.(id, nextOrder);
    announce(
      nextOrder === SORT_ORDER.ASC
        ? tAnnounce("sortedAsc")
        : tAnnounce("sortedDesc")
    );
  };

  const ariaSort = (col: ListColumn<T>) => {
    if (!col.sortable) return undefined;
    if (sortBy !== col.id) return "none" as const;
    return sortOrder === SORT_ORDER.ASC
      ? ("ascending" as const)
      : ("descending" as const);
  };

  return (
    <ListTableCard>
      <Table containerClassName="md:h-full">
        {caption && <TableCaption className="sr-only">{caption}</TableCaption>}
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.id}
                scope="col"
                aria-sort={ariaSort(col)}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  alignClass(col.align),
                  hideBelowClass(col.hideBelow),
                  col.headerClassName
                )}
              >
                {col.sortable && onSort ? (
                  <ListSortHeader
                    label={
                      col.srOnlyHeader ? (
                        <span className="sr-only">{col.header}</span>
                      ) : (
                        col.header
                      )
                    }
                    active={sortBy === col.id}
                    order={sortBy === col.id ? sortOrder : undefined}
                    ariaLabel={tList("sortBy", {
                      column: typeof col.header === "string" ? col.header : col.id
                    })}
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
    </ListTableCard>
  );
};
```

**Lưu ý:** đổi từ arrow-implicit-return (`=> (`) sang block body (`=> { ... return ( ... ) }`) vì cần hooks. Giữ `export default ListTable;`.

- [ ] **Step 2: Verify** `npx tsc --noEmit && yarn lint` → PASS.

---

### Task 6: Wire AdminApps (sortable/width/hideBelow + client sort)

**Files:**
- Modify: `client/src/dataSources/AdminApps/index.tsx`
- Modify: `client/src/views/AdminApps/mains/AdminAppsTable/index.tsx`
- Modify: `client/src/types/AdminApps/index.ts` (nếu cần type accessor — dùng `Record` inline nên có thể không)

**Interfaces:**
- Consumes: `useClientSortedRows` (Task 3), `ListColumn` mới (Task 1), `COLUMN_BREAKPOINT`.
- Produces: `ADMIN_APPS_SORT_ACCESSORS: Record<string, (app: WebApp) => string | number>`.

- [ ] **Step 1: `dataSources/AdminApps`** — thêm import `COLUMN_BREAKPOINT` (từ `@/constants/list`) và mark columns. Trong `buildAdminAppsColumns`:
  - cột `app`: thêm `sortable: true, width: "28%"`
  - cột `category`: thêm `hideBelow: COLUMN_BREAKPOINT.SM`
  - cột `redirectUris`: thêm `hideBelow: COLUMN_BREAKPOINT.MD`
  - cột `updatedAt`: thêm `sortable: true`

  Thêm accessors (sau `buildAdminAppsColumns`):

```ts
export const ADMIN_APPS_SORT_ACCESSORS: Record<
  string,
  (app: WebApp) => string | number
> = {
  app: (app) => app.displayName.toLowerCase(),
  updatedAt: (app) => app.updatedAt
};
```

- [ ] **Step 2: `AdminAppsTable`** — import `useClientSortedRows` (từ `@/hooks`) + `ADMIN_APPS_SORT_ACCESSORS` (dataSources). Thay:

```tsx
const items = data?.items ?? [];
```
bằng:
```tsx
const rawItems = data?.items ?? [];
const items = useClientSortedRows(
  rawItems,
  query.sortBy,
  query.sortOrder,
  ADMIN_APPS_SORT_ACCESSORS
);
```
Và truyền sort props cho `<ListTable>`:
```tsx
<ListTable
  columns={columns}
  rows={items}
  getRowKey={(r) => r._id}
  sortBy={query.sortBy}
  sortOrder={query.sortOrder}
  onSort={query.setSort}
  rowActions={(app) => ( ... )}
  actionsLabel={tTable("actions")}
/>
```

- [ ] **Step 3: Verify** `cd client && yarn lint && yarn build` → PASS (build = type-check).

---

### Task 7: E2E — expand matrix → `e2e.md` + test file

**Files:**
- Create: `docs/specs/list-table-column-controls/e2e.md`
- Create: `client/e2e/admin-apps-sort/admin-apps-sort.e2e.ts`

**Interfaces:**
- Consumes: helpers `client/e2e/helpers/`, admin auth (project `admin`).

- [ ] **Step 1: Viết `e2e.md`** — copy Scenario Matrix từ design.md, đánh dấu scenario nào thành test, scenario defer + lý do.

- [ ] **Step 2: Viết test** `client/e2e/admin-apps-sort/admin-apps-sort.e2e.ts` (project admin) cover các scenario `A`:
  - happy: click header "App" → rows theo displayName asc (so sánh text cột đầu tăng dần) + `th[aria-sort="ascending"]`; click lại → descending.
  - toggle state: asc→desc→asc; switch sang "Updated" → App mất aria-sort, Updated=ascending.
  - URL persist: sau sort, `page.url()` chứa `sortBy=app&sortOrder=asc`; `page.reload()` giữ aria-sort.
  - validation: goto `?sortBy=status` (no accessor) → không crash, thứ tự = server; `?sortBy=___bogus` → không crash.
  - filter+sort: set filter status=active rồi sort updatedAt → sort trên tập lọc.
  - a11y: header sort là `getByRole("button", { name: /sort by/i })`, focus + `keyboard.press("Enter")` → sort đổi.
  - i18n: lặp cho locale `vi` (path prefix `/vi`).
  - responsive: `page.setViewportSize({ width: 639 })` → cột "Category" ẩn; `{ width: 640 }` → hiện.

  (deferred nếu seed apps < 2: ghi lý do trong e2e.md — cần ≥2 app để assert thứ tự.)

- [ ] **Step 3: Dual-gate §4.3** — self-check app running; dispatch gate A (`yarn e2e` scope admin-apps-sort) + gate B (MCP walk matrix, auth context riêng). Cả 2 PASS mới qua.

---

## Self-Review

- **Spec coverage**: §4.1→T1, §4.2→T1, §4.5(hideBelowClass)→T2, §4.6(hook)→T3, §4.4+ListSortHeader→T4, §4.3(ListTable)→T5, §4.7(wire)→T6, §6(E2E)→T7. ✅ đủ.
- **Type consistency**: `ColumnBreakpoint`/`COLUMN_BREAKPOINT` nhất quán T1↔T2↔T6; `useClientSortedRows` signature nhất quán T3↔T6; `onSort(id,order)`↔`setSort(by,order)` khớp; `ListSortHeader` props T4↔T5 khớp. ✅
- **Placeholder scan**: không TBD/TODO. ✅
