# Design — Refactor `components/list/` → `PageContainer/` + tách `CustomTable`

> **Status**: Draft (brainstorming) — chờ user duyệt spec
> **Date**: 2026-07-09
> **Feature branch**: `refactor/page-container` (worktree per-repo: `client/`, `docs/`)
> **Scope**: FE-only (`client/src/**`) + spec docs. KHÔNG đụng `server/`.
> **Loại**: Refactor thuần — **không đổi behavior** người dùng thấy/tương tác. → skip E2E (§4.3), skip SuperDesign (§5 step 1.5), skip security review (§4.5).

## 1. Bối cảnh & mục tiêu

`src/components/list/` hiện gom 11 component dùng chung cho mọi trang danh sách. Hai vấn đề:

1. **Tên khó hiểu / trái nghĩa**: prefix `List` lặp lại trong folder đã tên `list/`; `ListContent` không nói lên nó switch loading/empty/data; `DateRangeFilter` lệch prefix. Bản chất các component này dựng **thân của một trang** (page container), không riêng gì "list".
2. **`ListTable` không tái dùng được ngoài trang list**: bảng bị khóa trong hệ `list/` + gói cứng `ListTableCard` (surface + sticky + full-height) nên không dùng lại chỗ khác được.

**Mục tiêu**:

- Đổi `src/components/list/` → `src/components/PageContainer/`, prefix `List*` → `Page*` cho các component khung trang.
- Tách bảng thành **`CustomTable`** độc lập (`src/components/CustomTable/`), full-height thành **opt-in**, dùng lại được nhiều nơi.
- Bỏ `ListPagination` (wrapper mỏng quanh `CustomPagination` + dòng "results" gần như không hiển thị) → dùng `CustomPagination` trực tiếp.

## 2. Quyết định thiết kế

### 2.1. Rename folder + component khung trang

Folder `src/components/list/` → `src/components/PageContainer/` (PascalCase — theo yêu cầu user; lệch nhẹ quy ước "folder gom nhóm lowercase" như `ui/`, nhưng user chủ động chọn).

| Cũ (`list/`) | Mới (`PageContainer/`) |
| --- | --- |
| `ListPageShell` | `PageShell` |
| `ListPageHeader` | `PageHeader` |
| `ListToolbar` | `PageToolbar` |
| `ListContent` | `PageContent` |
| `ListEmptyState` | `PageEmptyState` |
| `ListFilterPanel` | `PageFilterPanel` |
| `DateRangeFilter` | `PageDateRangeFilter` |

Import nội bộ đổi theo: `PageContent`→`PageEmptyState`; `PageToolbar`→`PageFilterPanel`→`PageDateRangeFilter`.

**KHÔNG rename** (giữ nguyên — là tầng dữ liệu "list query", vẫn đúng nghĩa): hook `useListQuery`, type `ListQueryState`/`ListFilterDef`/`ListFilterOption`/`SortOrder`/`DateRangePreset` (`@/types/List`), i18n namespace `list`, `CONSTANTS.LIST`.

### 2.2. Tách `CustomTable` (gộp `ListTable` + `ListTableCard` + `ListSortHeader`)

Vị trí: `src/components/CustomTable/` với sub-component nested (theo yêu cầu user):

```
src/components/CustomTable/
  index.tsx                       # CustomTable<T> (default export)
  components/
    SortHeader/index.tsx          # từ list/ListSortHeader (chỉ CustomTable dùng)
```

**API `CustomTable<T>`** (giữ nguyên khả năng của `ListTable` #54 + thêm `fullHeight`):

| Prop | Type | Ghi chú |
| --- | --- | --- |
| `columns` | `CustomTableColumn<T>[]` | (đổi từ `ListColumn<T>`) |
| `rows` | `T[]` | |
| `getRowKey` | `(row: T) => string` | |
| `getRowHref?` | `(row: T) => string` | row click → Link overlay |
| `rowLabel?` | `(row: T) => string` | aria-label cho row link |
| `rowActions?` | `(row: T) => ReactNode` | cột actions cuối |
| `actionsLabel?` | `string` | sr-only header cột actions |
| `caption?` | `string` | sr-only `<caption>` |
| `sortBy?` | `string` | (#54) |
| `sortOrder?` | `SortOrder` | (#54) — import từ `@/types/List` |
| `onSort?` | `(id: string, order: SortOrder) => void` | (#54) |
| `fullHeight?` | `boolean` (default `false`) | **MỚI** |
| `sortByLabel?` | `(columnLabel: string) => string` | override i18n; default `common.table` |
| `sortedAscLabel?` | `string` | override announce; default `common.table` |
| `sortedDescLabel?` | `string` | override announce; default `common.table` |

**`fullHeight`**:

- `false` (default): render bảng trong surface card (`bg-card rounded-xl border overflow-hidden`) **không** sticky header, **không** ràng buộc chiều cao — bảng cao theo nội dung. Dùng được mọi nơi.
- `true`: bật đúng hành vi `ListTableCard` cũ — surface + `md:flex md:min-h-0 md:flex-col` + sticky thead (`md:[&_thead_th]:sticky top-0 z-10`) + `<Table containerClassName="md:h-full">`. Trang list full-height truyền `<CustomTable fullHeight>`.
- `className` / `containerClassName` passthrough để nơi cần tự tùy biến.

**Xóa** `list/ListTable/`, `list/ListTableCard/`, `list/ListSortHeader/`.

### 2.3. Bỏ `ListPagination`

- **Xóa** `list/ListPagination/`.
- 6 view đang dùng `<ListPagination>` → thay bằng `<CustomPagination>` render có điều kiện: `{totalPages > 1 && <CustomPagination page={query.page} totalPages={totalPages} onPageChange={query.setPage} />}`.
  - Giữ nguyên hành vi hiện tại "ẩn khi ≤ 1 trang" (ListPagination có guard `totalPages <= 1 return null`; các view hiện truyền `totalPages={1}` nên vốn không hiện — không đổi UX).
- **Bỏ** dòng `{page} of {totalPages} · {total} results` + spinner loading + container `flex justify-between` bên trái. Nơi nào cần layout/nội dung trái cạnh pagination → view tự css tại chỗ (không còn wrapper dùng chung).

### 2.4. Type: `CustomTableColumn` decouple khỏi `List`

Tạo `@/types/CustomTable/index.ts`:

```ts
export type ColumnAlign = "left" | "center" | "right";
export type ColumnBreakpoint =
  (typeof COLUMN_BREAKPOINT)[keyof typeof COLUMN_BREAKPOINT]; // derive từ @/constants/list
export interface CustomTableColumn<T> {
  id: string;
  header: ReactNode;
  align?: ColumnAlign;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  srOnlyHeader?: boolean;
  sortable?: boolean;     // #54
  width?: string;         // #54
  hideBelow?: ColumnBreakpoint; // #54
}
```

`@/types/List`: **gỡ** `ListColumn`, `ColumnAlign`, `ColumnBreakpoint`. **Giữ** `SortOrder` (dùng bởi `ListQueryState` + `CustomTable` import lại — coupling nhỏ, chấp nhận: sort order là khái niệm chung, constant nguồn `SORT_ORDER` vẫn ở `@/constants/list`).

`src/utils` (`alignClass`, `hideBelowClass`): đổi import `ColumnAlign`/`ColumnBreakpoint` từ `@/types/List` → `@/types/CustomTable`.

### 2.5. i18n

- **Chuyển sang `common`** (default của CustomTable khi caller không truyền prop): thêm `common.table` = `{ sortBy: "Sort by {column}", sortedAscending, sortedDescending }` (en + vi). `CustomTable`/`SortHeader` đọc `useTranslations("common.table")` làm default, prop override thắng.
- **Gỡ khỏi `list.json`** (en + vi): `sortBy`, `pagination` (page/of/results), `announce.sortedAsc`, `announce.sortedDesc`.
- **Giữ trong `list.json`**: search/filters/clearAll/clearFilters/all/noResults*/emptyTitle/viewGrid/viewList/table/dateRange + `announce.{filtersApplied, filtersCleared, pageChanged}` (dùng bởi PageToolbar/PageFilterPanel/PageEmptyState/PageDateRangeFilter + hook `useListQuery`).

## 3. Phạm vi thay đổi (inventory)

### A. `src/components/`
- Đổi tên folder `list/` → `PageContainer/`; 7 component đổi tên (bảng §2.1).
- Tạo `CustomTable/index.tsx` + `CustomTable/components/SortHeader/index.tsx` (từ ListTable + ListTableCard + ListSortHeader).
- Xóa `list/ListTable`, `list/ListTableCard`, `list/ListSortHeader`, `list/ListPagination`.

### B. `src/types/`
- Tạo `CustomTable/index.ts` (`CustomTableColumn`, `ColumnAlign`, `ColumnBreakpoint`).
- `List/index.ts`: gỡ `ListColumn`, `ColumnAlign`, `ColumnBreakpoint`.

### C. `src/utils/index.ts`
- `alignClass`, `hideBelowClass`: đổi import type sang `@/types/CustomTable`.

### D. `src/dataSources/` (5 file build cột)
`AdminApps`, `AdminEntitlements`, `AdminUsers`, `ContactAdmin`, `LoginHistory`: đổi return type `ListColumn<T>[]` → `CustomTableColumn<T>[]` + import.

### E. `src/views/` (8 view)
`AdminApps`, `AdminUsers`, `AdminContact`, `AdminEntitlements`, `AdminLoginHistory`, `LoginHistory`, `Favorites`, `Apps`:
- Đổi import `@/components/list/List*` → `@/components/PageContainer/Page*`.
- Đổi `<ListTable>` → `<CustomTable fullHeight ...>` (nơi đang full-height); import `@/components/CustomTable`.
- Đổi `<ListPagination ...>` → `{totalPages > 1 && <CustomPagination .../>}`.

### F. i18n (`src/locales/en` + `vi`)
- `common.json`: thêm `table` (§2.5).
- `list.json`: gỡ `sortBy`, `pagination`, `announce.sortedAsc/Desc`.

### G. Docs / CLAUDE.md (§4.6 drift audit)
- `client/.claude/CLAUDE.md` dòng 76 & 94 liệt kê tên component cũ → cập nhật tên mới + note CustomTable/CustomPagination.
- ⚠️ `client/.claude` bị client repo **gitignore** → sửa có hiệu lực local nhưng **KHÔNG vào commit/PR**; sẽ flag user.

## 4. Non-goals / bảo toàn hành vi

- KHÔNG đổi behavior UX: sort, filter, search, empty/loading, full-height table, ẩn pagination khi ≤1 trang — tất cả giữ nguyên.
- KHÔNG rename tầng data (`useListQuery`, `ListQueryState`, i18n `list`, `CONSTANTS.LIST`).
- KHÔNG đụng `server/`. KHÔNG thêm feature mới.

## 5. Quy trình (CLAUDE.md)

- **Isolation**: worktree per-repo `client/` + `docs/` từ `origin/main` (đã tạo, branch `refactor/page-container`).
- **Skip**: E2E dual-gate (§4.3 — refactor, no behavior change), SuperDesign (§5 step 1.5 — không UI mới), security review (§4.5 — không đụng attack surface).
- **Green checks (§4.7 — BẮT BUỘC)**: `cd client && yarn lint && yarn build` phải xanh (webpack `next build` type-check luôn).
- **CLAUDE.md drift (§4.6)**: cập nhật `client/.claude/CLAUDE.md` (gitignored — flag).
- **PR (§5 step 5)**: per-repo — `client/` (code) + `docs/` (spec). `client/.claude` không vào PR do gitignore.

## 6. Rủi ro

- **Blast radius rộng** (8 view + 5 dataSource + types + utils + i18n): chủ yếu cơ học (rename import/JSX). Mitigate: `yarn lint`/`yarn build` bắt hết reference gãy.
- **Coupling `SortOrder`**: CustomTable import `SortOrder` từ `@/types/List` — chấp nhận (constant nguồn ở `@/constants/list`).
- **`common.table` mới**: đảm bảo thêm CẢ en + vi để `next build` không lỗi missing message.
