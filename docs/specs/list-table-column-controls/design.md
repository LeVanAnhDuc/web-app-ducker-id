# Design — List Table Column Controls (sortable / width / hideBelow)

## 1. Mục tiêu

Mở rộng API declarative của bảng danh sách dùng chung (`ListColumn` + `ListTable`) để hỗ trợ 3 tùy chỉnh cột mà hiện phải làm ad-hoc hoặc chưa làm được:

1. **`sortable`** — cột có thể sort. Sort đã có sẵn hạ tầng ở `useListQuery` (`sortBy`/`sortOrder`/`setSort`, đẩy vào URL) nhưng **chưa được surface lên `ListTable`** → hiện muốn sort phải tự chế header + gọi `setSort` ở từng trang. Feature này nối hạ tầng đó lên component.
2. **`width`** — chiều rộng cột khai báo tường minh (thay vì rải `max-w-*` qua `cellClassName`).
3. **`hideBelow`** — ẩn cột dưới một breakpoint (responsive), áp đồng thời cho `<th>` và `<td>` (tránh lệch header/cell khi chỉ set 1 trong 2 như cách thủ công `hidden md:table-cell`).

## 2. Non-goals

- KHÔNG đổi tên key hiện có (`id`, `header`, `align`, `cell`, `headerClassName`, `cellClassName`, `srOnlyHeader`) — chúng rõ nghĩa, đổi = churn vô ích.
- KHÔNG thêm server-side sort cho BE. BE apps list dùng sort cố định (`displayName`), không nhận `sortBy`/`sortOrder` query param → **feature thuần FE**, sort là client-side.
- KHÔNG thêm `footer`, `colSpan`, `sticky/resizable column`, `per-column filter` (YAGNI — bảng hiện chưa dùng).
- KHÔNG refactor `alignClass` (đang dùng literal `"center"/"right"` — pre-existing, ngoài scope).

## 3. Reuse check (cross-stack)

- **FE-only** — không đụng `server/src/**`. Không có mapping BE DTO ↔ FE type mới.
- Tái dùng hạ tầng có sẵn: `useListQuery.setSort`, `SORT_ORDER` (`constants/list.ts`), `alignClass`/`cn`, `CustomButton`, `useAnnounce`, namespace i18n `list`.
- **AdminApps là bảng client-side duy nhất** (`getAdminApps` trả toàn bộ `items`, `totalPages=1`) → chọn làm nơi wire demo sort. AdminUsers/LoginHistory server-paginated (client-sort chỉ sort trang hiện tại = sai) nên KHÔNG wire sort ở đó trong PR này.

## 4. Thiết kế API

### 4.1 `ListColumn<T>` — thêm 3 key (`src/types/List/index.ts`)

```ts
export interface ListColumn<T> {
  id: string;
  header: ReactNode;
  align?: ColumnAlign;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  srOnlyHeader?: boolean;
  sortable?: boolean;              // NEW — cột cho phép sort
  width?: string;                  // NEW — CSS width áp inline lên <th>+<td> (vd "28%", "12rem")
  hideBelow?: ColumnBreakpoint;    // NEW — ẩn cột dưới breakpoint này
}

export type ColumnBreakpoint =
  (typeof COLUMN_BREAKPOINT)[keyof typeof COLUMN_BREAKPOINT];
```

- `width` là **giá trị tùy ý** (200px/28%/…) → truyền thẳng làm inline style, KHÔNG cần constant.
- `hideBelow` là **enum** → derive type từ constant `COLUMN_BREAKPOINT` (tránh magic string, theo `constants.md` "derive type từ constant").

### 4.2 Constant (`src/constants/list.ts`)

```ts
export const COLUMN_BREAKPOINT = { SM: "sm", MD: "md", LG: "lg" } as const;
```

(`SORT_ORDER` đã có sẵn trong file này — tái dùng cho toggle logic, không thêm mới.)

### 4.3 `ListTable` — thêm props controlled-sort (`src/components/list/ListTable/index.tsx`)

```ts
sortBy?: string;
sortOrder?: SortOrder;
onSort?: (id: string, order: SortOrder) => void;
```

**Pattern controlled (value + onChange):** callback `onSort` phải đi kèm `sortBy`/`sortOrder` để header render được chỉ báo cột active + hướng. Không dùng callback "emit-only".

**Toggle logic nằm trong `ListTable`** (nó biết state hiện tại):

```ts
const handleSort = (id: string) => {
  const isActive = sortBy === id;
  const nextOrder =
    isActive && sortOrder === SORT_ORDER.ASC ? SORT_ORDER.DESC : SORT_ORDER.ASC;
  onSort?.(id, nextOrder);
  announce(nextOrder === SORT_ORDER.ASC ? tAnnounce("sortedAsc") : tAnnounce("sortedDesc"));
};
```

2-state toggle (asc ↔ desc, click đầu = asc). `useListQuery.setSort` chỉ hỗ trợ set (không clear) → không có state "none" cho cột đang active.

**Wiring ở consumer** (khớp signature `setSort`):

```tsx
<ListTable
  columns={columns}
  rows={sortedItems}
  sortBy={query.sortBy}
  sortOrder={query.sortOrder}
  onSort={query.setSort}
/>
```

### 4.4 Header rendering + accessibility

- `<TableHead>` set `aria-sort`: cột `sortable` đang active → `"ascending"`/`"descending"`; sortable chưa active → `"none"`; không sortable → bỏ attribute.
- Cột `sortable` render qua component tách riêng **`ListSortHeader`** (`src/components/list/ListSortHeader/index.tsx`) — dùng `CustomButton variant="ghost" size="sm"` (KHÔNG raw `<button>`), nội dung = `header` + icon:
  - chưa active → `ArrowUpDown` (icon-map: "Sort")
  - active asc → `ArrowUp`; active desc → `ArrowDown` (thêm 2 icon này vào `icon-map.md`)
- `announce` khi đổi sort (accessibility rule: Table/Grid → Sort column) qua namespace `list.announce` (`sortedAsc`/`sortedDesc`, en+vi).

### 4.5 width + hideBelow rendering

- `width` → `style={{ width: col.width }}` trên `<th>` và `<td>`.
- `hideBelow` → util mới `hideBelowClass(breakpoint)` (cạnh `alignClass` trong `src/utils/index.ts`) trả class Tailwind **tĩnh** (Tailwind cần literal để extract):

```ts
export const hideBelowClass = (breakpoint?: ColumnBreakpoint): string => {
  switch (breakpoint) {
    case COLUMN_BREAKPOINT.SM: return "hidden sm:table-cell";
    case COLUMN_BREAKPOINT.MD: return "hidden md:table-cell";
    case COLUMN_BREAKPOINT.LG: return "hidden lg:table-cell";
    default: return "";
  }
};
```

Áp cho **cả** `<th>` và `<td>`: `cn(alignClass(col.align), hideBelowClass(col.hideBelow), col.headerClassName|cellClassName)`.

### 4.6 Client-side sort hook (`src/hooks/useClientSortedRows.ts`)

Bảng client-side (all items 1 trang) cần sort tại chỗ. Hook thuần, tái dùng:

```ts
const useClientSortedRows = <T,>(
  rows: T[],
  sortBy: string | undefined,
  sortOrder: SortOrder | undefined,
  accessors: Record<string, (row: T) => string | number>
): T[];
```

- Không có `sortBy` hoặc không có accessor tương ứng → trả `rows` nguyên (giữ thứ tự server).
- Có → copy + sort ổn định theo accessor, đảo chiều theo `sortOrder`. Bọc `useMemo`.
- Vào barrel `src/hooks/index.ts`.

### 4.7 Wire vào AdminApps (demo + surface E2E)

- `buildAdminAppsColumns`: `app` (sortable, `width`), `updatedAt` (sortable), `category` (`hideBelow: SM`), `redirectUris` (`hideBelow: MD`).
- `ADMIN_APPS_SORT_ACCESSORS` trong `dataSources/AdminApps`: `{ app: a => a.displayName.toLowerCase(), updatedAt: a => a.updatedAt }`.
- `AdminAppsTable`: `const sortedItems = useClientSortedRows(items, query.sortBy, query.sortOrder, ADMIN_APPS_SORT_ACCESSORS)` → truyền `rows={sortedItems}` + `sortBy/sortOrder/onSort={query.setSort}` cho `ListTable`.

## 5. Files touched

**client/** (repo `web-store-apps`)
- `src/types/List/index.ts` — thêm `sortable`/`width`/`hideBelow` + type `ColumnBreakpoint`
- `src/constants/list.ts` — thêm `COLUMN_BREAKPOINT`
- `src/utils/index.ts` — thêm `hideBelowClass`
- `src/components/list/ListTable/index.tsx` — props sort + render width/hideBelow/aria-sort
- `src/components/list/ListSortHeader/index.tsx` — NEW, nút sort header
- `src/hooks/useClientSortedRows.ts` + `src/hooks/index.ts` — NEW hook + barrel
- `src/dataSources/AdminApps/index.tsx` — sortable/width/hideBelow + accessors
- `src/views/AdminApps/mains/AdminAppsTable/index.tsx` — wire sort
- `src/locales/en/list.json` + `vi/list.json` — `announce.sortedAsc`/`sortedDesc`

**docs/** (repo `docs`)
- `specs/list-table-column-controls/{design,plan,e2e}.md`

**Follow-up (KHÔNG trong PR này)** — `.claude` là repo riêng (remote `claude-architecture`); thêm `ArrowUp`/`ArrowDown` (sort direction) vào `.claude/uiux/icon-map.md` là housekeeping design-system, defer để không kéo repo thứ 4 vào PR chỉ vì 2 dòng doc (`ArrowUpDown` đã map sẵn khái niệm "Sort").

## 6. E2E Scenario Matrix

Feature đụng `client/src/**`, thêm behavior tương tác (click header sort, cột ẩn theo breakpoint) → E2E bắt buộc. Trang: **AdminApps** (project `admin`). Bảng read-only về mutation sort (client-side, không ghi DB) → phần lớn `A+B`.

| #   | Category                    | Scenario / kỹ thuật                                                                                                                                                                                                                              | Gate    |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Happy path                  | ✅ Admin mở /admin/apps → click header "App" → rows sort A→Z theo displayName + icon `ArrowUp` hiện + `aria-sort="ascending"`; click lần 2 → Z→A + `ArrowDown` + `aria-sort="descending"`. Click "Updated" → sort theo updatedAt.                | A+B     |
| 2   | AuthN                       | ✅ Chưa đăng nhập vào /admin/apps → redirect /login (auth guard, không đổi bởi feature nhưng verify vẫn nguyên).                                                                                                                                | A+B     |
| 3   | AuthZ                       | ✅ **[DT]** role × endpoint: USER (non-admin) gọi API admin apps → BE 403 (FE admin route không có role guard riêng — theo [[reference_e2e_auth_ratelimit_gotchas]]). Admin → 200 + thấy cột sortable.                                          | A+B     |
| 4   | Validation / expected-error | ✅ **[EP]** URL `?sortBy=` classes: hợp lệ (`app`,`updatedAt`) → sort; **không có accessor** (`sortBy=status`) → giữ nguyên thứ tự (no crash); **rác** (`sortBy=___bogus`) → giữ nguyên. **[EP]** `sortOrder` ∉ {asc,desc} → `undefined` → không sort. | A+B     |
| 5   | Empty / null states         | ✅ Filter status=inactive cho ra 0 app → empty state; click sort header khi rỗng → không crash (không có row để sort).                                                                                                                          | A+B     |
| 6   | Boundary / pagination       | ✅ **[ST]** sort toggle state: unsorted→asc→desc→asc (2-state, không có "none" cho cột active). **[ST invalid]** đổi sort sang cột khác khi đang active cột cũ → cột mới về asc, cột cũ mất chỉ báo. AdminApps 1 trang → pagination N/A sâu.     | A+B     |
| 7   | Filter / search             | ✅ Sort persist trong URL (`sortBy`/`sortOrder` query param) — reload giữ nguyên sort. **[DT]** filter status=active + sort updatedAt → sort áp trên tập đã lọc. Search + sort kết hợp.                                                          | A+B     |
| 8   | Data rendering              | ✅ Cột `hideBelow` không phá render; giá trị cell vẫn human label (category name không phải id, updatedAt format không ISO thô) sau khi sort.                                                                                                     | A+B     |
| 9   | i18n (en+vi)                | ✅ `announce.sortedAsc/sortedDesc` render đúng en + vi (không lộ key). `aria-label` nút sort đúng locale. Verify cả 2 locale.                                                                                                                     | A+B     |
| 10  | Error / loading             | ✅ Loading skeleton khi fetch apps; API 5xx → error/empty UI (feature không đổi path này, verify không regress).                                                                                                                                | A+B     |
| 11  | Mutation safety             | N/A — sort client-side, KHÔNG ghi DB/gọi mutation. Không có state server để revert.                                                                                                                                                            | —       |
| 12  | Accessibility               | ✅ **[a11y]** `<th aria-sort>` đúng 3 giá trị; nút sort là button có `aria-label`, focus/keyboard (Enter/Space trigger sort); `hidden` column không nằm trong tab order. Selector ưu tiên role `columnheader` + name.                            | A+B     |
| +   | Responsive (feature-riêng)  | ✅ **[BVA]** breakpoint hideBelow: viewport `sm` (640px): cột `category`(hideBelow sm) ẩn dưới 640, hiện ≥640; cột `redirectUris`(hideBelow md) ẩn dưới 768, hiện ≥768. Đo tại `639/640` và `767/768`.                                          | B (visual) |

**Completeness critic**: user chưa yêu cầu "thorough/≥90%" tường minh nhưng feature có nhánh edge (invalid sortBy, breakpoint) → sẽ chạy 1 critic subagent ở `writing-plans` để bắt case sót (double-click nhanh, sort khi đang loading, back-button giữ sort).

## 7. Rủi ro & quyết định

- **Client-side sort chỉ đúng cho bảng 1-trang**: chỉ wire AdminApps (thỏa điều kiện). Hook `useClientSortedRows` document rõ ràng buộc này để không bị lạm dụng cho bảng server-paginated.
- **AdminAppsTable đã 227 dòng (>200 rule pre-existing)**: additions tối thiểu (1 dòng hook + 3 props). KHÔNG refactor phần cũ (ngoài scope); flag pre-existing ở review.
- **`width` inline style vs Tailwind**: dùng inline vì width là giá trị tự do; hideBelow dùng class tĩnh vì Tailwind cần literal.
