# Design — List Table UX (column-config, align, row-click, kebab, height, pagination)

## 1. Mục tiêu

4 cải tiến UX cho các bảng list (follow-up của feature full-height-list-tables):

1. **Table co theo nội dung khi ít item** — nhiều item: cap đúng viewport + cuộn nội bộ (giữ như hiện tại); **ít item: card cao đúng nội dung, không giãn full viewport**.
2. **Pagination 1 dòng** — `Page X of Y · N results` sát trái, cụm controls sát phải, cùng một dòng (không wrap, không center).
3. **Column align** — cột khai `align: 'left' | 'center' | 'right'` (mặc định `left`) trong column-config ở dataSource; header + cell tự áp CSS canh lề.
4. **Row-click detail + kebab actions** — row có detail thì bấm vào row để vào detail (stretched link, hover đổi nền + cursor-pointer), **bỏ nút "View" cuối**; các action khác gom vào **kebab 3-chấm** cột cuối (pattern như AdminUsers).

## 2. Quyết định kiến trúc — `ListTable<T>` column-config renderer

Hiện mỗi bảng render `TableHead`/`TableCell` **inline** trong view (không có column-config). Chọn **full column-config renderer**: 1 component chung `ListTable<T>` điều khiển bằng mảng `ListColumn<T>[]`, dùng cho **cả 6 bảng**. Cột khai dạng **data** trong `dataSources/<Feature>` (builder nhận translator — cùng pattern `buildLoginHistoryFilterDefs`).

`ListTable` gói luôn `ListTableCard` (card + scroll + sticky header từ feature trước) + `<Table containerClassName="md:h-full">` + render header/body/actions. Pagination vẫn tách (`ListPagination`).

### 2.1 Types (`src/types/List/index.ts`)

```ts
export type ColumnAlign = "left" | "center" | "right";

export interface ListColumn<T> {
  id: string;
  header: ReactNode;               // label i18n (resolve ở view, truyền vào builder)
  align?: ColumnAlign;             // default "left"
  cell: (row: T) => ReactNode;     // render cell — badge / time / custom đều được
  headerClassName?: string;
  cellClassName?: string;
  srOnlyHeader?: boolean;          // header ẩn (vd cột actions)
}
```

*(Type props của `ListTable` viết INLINE tại param — theo rule `types.md`; chỉ `ListColumn`/`ColumnAlign` là shared type nên nằm ở `types/List`.)*

### 2.2 `ListTable` props (inline)

```tsx
const ListTable = <T,>({
  columns,          // ListColumn<T>[]
  rows,             // T[]
  getRowKey,        // (row: T) => string
  getRowHref,       // (row: T) => string  — optional; bật stretched-link row → detail
  rowLabel,         // (row: T) => string  — optional; aria-label cho row link
  rowActions,       // (row: T) => ReactNode — optional; nội dung kebab → cột actions cuối
  caption           // string — optional; sr-only <TableCaption>
}: { ... }) => { ... }
```

Renderer:
- Bọc `<ListTableCard><Table containerClassName="md:h-full">`.
- `<TableCaption className="sr-only">` nếu có `caption`.
- Header: `columns.map` → `<TableHead scope="col" className={cn(alignClass(col.align), col.headerClassName)}>` (wrap `sr-only` nếu `srOnlyHeader`). Nếu có `rowActions` → thêm 1 `TableHead` actions (header sr-only).
- Body: `rows.map` → `<TableRow>` (xem §5 cho row-click). Mỗi cột → `<TableCell className={cn(alignClass(col.align), col.cellClassName)}>{col.cell(row)}</TableCell>`. Nếu có `rowActions` → thêm `<TableCell>` cuối chứa kebab.

## 3. #1 — Table co theo nội dung khi ít item

Feature trước dùng `flex-1` ⇒ vùng table **luôn giãn** đầy viewport. Bỏ ép giãn:

- `ListContent` (nhánh `fullHeight`): wrapper đổi `md:flex md:min-h-0 md:flex-1 md:flex-col` → **`md:flex md:min-h-0 md:flex-col`** (bỏ `md:flex-1`).
- `ListTableCard`: đổi `md:flex md:min-h-0 md:flex-1 md:flex-col` → **`md:flex md:min-h-0 md:flex-col`** (bỏ `md:flex-1`).

Hệ quả (flex item default `flex: 0 1 auto` + `min-h-0`): nội dung ≤ chỗ trống → card cao **đúng nội dung** (khoảng trống nằm dưới); nội dung > chỗ trống → item co lại (`min-h-0`) → container scroll của `<Table>` (`md:h-full`) cuộn nội bộ, sticky header giữ nguyên. Pagination (`shrink-0`) bám ngay dưới table.

`<md`: không đổi (ràng buộc `md:`).

## 4. #2 — Pagination 1 dòng (results trái / controls phải)

Root cause: `ui/pagination.tsx` `Pagination` có base `mx-auto flex w-full justify-center` → `CustomPagination` bị stretch full-width + center.

- `ListPagination`: giữ `flex items-center justify-between gap-2`, thêm **`flex-nowrap`** để luôn 1 dòng; results-text bên trái, `CustomPagination` bên phải.
- Truyền `className="w-auto justify-end"` vào `CustomPagination` → tailwind-merge override `w-full justify-center` (base `mx-auto` vô hại khi `w-auto` trong flex `justify-between`). KHÔNG sửa `ui/pagination.tsx` (immutable) — override qua prop `className` mà `CustomPagination` đã forward.
- KHÔNG đổi behavior "ẩn khi `totalPages <= 1`" hiện có.

## 5. #4 — Row-click detail (stretched link) + kebab actions

### 5.1 Row-click (stretched link)
Khi `getRowHref` có:
- `<TableRow className="relative cursor-pointer hover:bg-muted/50">`.
- Trong `<TableCell>` đầu, render thêm `<Link href={getRowHref(row)} aria-label={rowLabel?.(row)} className="absolute inset-0 z-0">` (Link locale-aware từ `@/i18n/navigation`) — phủ toàn row (containing block là `tr` do `relative`). Chuẩn a11y: Tab focus, Enter mở, screen-reader đọc link, right-click open-in-new-tab / deep-link OK.
- Cột **actions** đặt `<TableCell className="relative z-10">` để kebab nổi trên stretched-link.
- Tradeoff đã chấp nhận: bôi đen text trong row khó hơn (đánh đổi của stretched-link).

Áp cho **AdminContact, AdminLoginHistory** → **bỏ nút "View"/ChevronRight cuối**; các bảng này không có action khác → **không cột kebab**.

### 5.2 Kebab actions
`rowActions?: (row) => ReactNode` → renderer thêm cột cuối chứa kebab. Nội dung kebab do view cung cấp, tái dùng pattern `DropdownMenu` + `MoreHorizontal` (như `UserRowActions`/`AppRowActions`). DropdownMenu (Radix) tự chặn propagation; cột đặt `relative z-10` để không bị stretched-link nuốt click.

- **Giữ kebab** (đã có, không detail): AdminUsers (reset pw / lock / force logout), AdminApps (edit / hide-unhide), AdminEntitlements (revoke). Refactor sang `ListTable` nhưng hành vi action giữ nguyên; các component `*RowActions` hiện có tái dùng làm `rowActions(row)`.
- **Không detail, không action**: LoginHistory (của user) — không `getRowHref`, không `rowActions`; chỉ hưởng align + height + pagination.
- `ListTable` hỗ trợ **đồng thời** `getRowHref` + `rowActions` (cho tương lai), dù hiện chưa bảng nào cần cả hai.

## 6. Migration 6 bảng

Mỗi bảng: (a) tạo `build<Feature>Columns(t...)` trong `dataSources/<Feature>` trả `ListColumn<T>[]` (chuyển từng cell inline thành `cell: (row)=>...`, gắn `align` nơi cần); (b) view thay khối `<ListTableCard><Table>…</Table></ListTableCard>` bằng `<ListTable columns={...} rows={items} getRowKey={r=>r._id} ... />`; (c) bảng có detail → truyền `getRowHref` + `rowLabel`, bỏ nút View; bảng có action → truyền `rowActions`.

- `AdminContact` → columns + `getRowHref` (ADMIN_CONTACT/:id) + `rowLabel`; bỏ nút View. Cột status/actions cân nhắc `align`.
- `AdminLoginHistory` → columns + `getRowHref` (ADMIN_LOGIN_HISTORY/:id) + `rowLabel`; bỏ nút View.
- `AdminUsers` → columns + `rowActions={<UserRowActions .../>}` (giữ dialogs).
- `AdminApps` → columns + `rowActions={<AppRowActions .../>}`.
- `AdminEntitlements` → columns + `rowActions` (revoke); giữ điều kiện render + không pagination.
- `LoginHistory` → columns only.

`align` cụ thể mỗi cột (numeric/badge/actions thường `center`/`right`) chốt khi viết plan/columns; mặc định `left`.

## 7. Data flow

Không đổi request/schema/query. Chỉ đổi tầng render bảng (inline JSX → column-config) + navigation row-click (đã có `router.push`, nay là `<Link>`). Không chạm API contract.

## 8. Error / edge handling

- **Loading skeleton / empty state**: `ListContent` vẫn quản 3 nhánh; skeleton/empty nằm trong vùng `min-h-0` (không giãn full nữa — nhất quán #1).
- **Row không có href**: không render Link, row không `cursor-pointer` (bảng không detail).
- **Kebab + stretched-link**: z-index tách (`z-10` actions vs `z-0` link) — click menu không điều hướng.
- **`<md`**: full-height + sticky không kích hoạt; row-click/kebab/align vẫn hoạt động bình thường (không `md:`-gate).
- **i18n**: header + kebab labels + `rowLabel` (aria) lấy từ i18n (en + vi); không hardcode string.

## 9. Testing / Verification

- **E2E §4.3 → SKIP (đã duyệt).** Không tạo matrix/e2e.md.
- **SuperDesign 1.5 → SKIP (đã duyệt).** Không mock.
- **Verify thủ công (bắt buộc):**
  1. Ít item: card cao đúng nội dung, không giãn; nhiều item: cuộn nội bộ + sticky header (regression check #1).
  2. Pagination: results trái / controls phải, 1 dòng, mọi bảng.
  3. Align: cột set `center`/`right` canh đúng ở cả header + cell.
  4. Row-click: AdminContact/AdminLoginHistory bấm row → detail; hover đổi nền + cursor; Tab tới row + Enter mở; kebab (nếu có) không trigger nav.
  5. Kebab: AdminUsers/AdminApps/AdminEntitlements action giữ nguyên hành vi.
  6. light/dark + en/vi + `<md`.
- **Green-checks §4.7 (FE):** `cd client && yarn lint && yarn build`.

## 10. Convention & skills

`client/.claude/CLAUDE.md` (list shell, Custom* wrapper), rules `components.md` / `views.md` / `jsx.md` / `imports.md` / `types.md` / `accessibility.md` (useAnnounce không bắt buộc thêm cho row-nav vì `<Link>` điều hướng chuẩn — route change announce đã có ở tầng chung). Skills: `standard-react`, `standard-typescript`, `standard-tailwind`, `standard-shadcn`, `standard-accessibility`.

## 11. Files dự kiến đụng

**client/** (`web-store-apps`):
- `src/types/List/index.ts` — `ColumnAlign`, `ListColumn<T>`
- `src/components/list/ListTable/index.tsx` — **mới**, renderer
- `src/utils/index.ts` (hoặc nơi util phù hợp) — `alignClass(align)` helper
- `src/components/list/ListContent/index.tsx` — bỏ `md:flex-1`
- `src/components/list/ListTableCard/index.tsx` — bỏ `md:flex-1`
- `src/components/list/ListPagination/index.tsx` — `flex-nowrap` + truyền `w-auto justify-end`
- `src/dataSources/<Feature>/` × 6 — builder `build<Feature>Columns`
- 6 view `mains/*Table/index.tsx` — dùng `ListTable`
- locale `en`/`vi` — key `rowLabel`/aria nếu cần (kebab labels đã có)

**docs/** (`doc-web-app-store`):
- `specs/list-table-ux/design.md` (file này) + `plan.md`

## 12. Non-goals (YAGNI)

- Không thêm sort/resize/reorder cột (chỉ align).
- Không virtualization / infinite scroll.
- Không đổi API/schema/query/route.
- Không đổi hành vi các action hiện có (chỉ đổi nơi đặt: kebab vs inline).
- Không đổi grid (Apps, Favorites) — chúng không dùng `<Table>`.
