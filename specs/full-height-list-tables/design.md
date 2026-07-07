# Design — Full-height List Tables (table gọn trong viewport)

## 1. Mục tiêu

Các trang **table** trong dashboard/admin phải **gọn trong chiều cao viewport còn lại**, không đẩy trang cuộn dài.

- Có header + filter phía trên → table (gồm bảng, pagination, và dòng `Page X of Y · N results`) chỉ chiếm phần viewport còn lại bên dưới.
- Chỉ có table (không header/filter đáng kể) → table chiếm gọn toàn bộ chiều cao viewport.
- Khi danh sách dài hơn chỗ trống: **chỉ các row cuộn nội bộ**; header cột **sticky** luôn hiện; pagination **ghăm đáy** vùng, luôn thấy.

## 2. Phạm vi

**Áp dụng cho 6 trang table** dùng `ListPageShell` + `<Table>`:

- `views/AdminContact/mains/AdminContactTable`
- `views/AdminUsers/mains/AdminUsersTable`
- `views/AdminLoginHistory/mains/AdminLoginHistoryTable`
- `views/AdminEntitlements/mains/AdminEntitlementsTable`
- `views/AdminApps/mains/AdminAppsTable`
- `views/LoginHistory/mains/LoginHistoryTable`

**KHÔNG áp dụng** cho 2 trang grid dùng chung shell — giữ nguyên cuộn tài liệu:

- `views/Apps/mains/AppsBoard`
- `views/Favorites/mains/FavoritesGrid`

**Responsive:** chỉ khóa viewport từ breakpoint `md` (≥768px) trở lên. Dưới `md` (mobile) trở về cuộn trang tự nhiên như hiện tại — tránh vùng cuộn table quá ngắn khó dùng.

## 3. Kiến trúc hiện tại (điểm mấu chốt)

Cả `DashboardLayout` và `AdminLayout` có cấu trúc chiều cao **giống hệt nhau**:

```
<div class="h-screen flex flex-col overflow-hidden">        ← shell root
  <AppHeader/>                                              ← chiều cao auto
  <div class="flex min-h-0 flex-1">                         ← row
    <Sidebar/>
    <SidebarInset class="flex-1 overflow-y-auto p-6 lg:p-8"> ← <main>, cuộn dọc, có padding
      <div id="main-content" tabIndex={-1}>                 ← ✗ KHÔNG có chiều cao xác định
        {children}                                          ← view (ListPageShell → …)
```

`ListPageShell` = `flex flex-col gap-6` bọc: `ListPageHeader` → `ListToolbar` → `ListContent` (table trong card `bg-card rounded-xl border`) → `ListPagination`.

**Nút thắt kỹ thuật:** shadcn `Table` (`ui/table.tsx`) tự bọc `<table>` trong `<div class="relative w-full overflow-auto">`. Container cuộn này **không expose className** → không bound được chiều cao ⇒ không có sticky-header + rows-scroll đúng cách (nested-scroll làm hỏng `position: sticky` nếu wrap từ ngoài).

## 4. Phương án chọn — App-shell flex + prop `fullHeight`

Chuyển list page từ "cuộn theo document flow" sang "app-shell flex column, table tự cuộn nội bộ". Cơ chế nhất quán, opt-in per-page, không đụng grid.

### 4.1 Layout height-chain (2 file)

`layouts/DashboardLayout/index.tsx` + `layouts/AdminLayout/index.tsx`: thêm class cho `#main-content` để nó lấp đầy chiều cao và làm flex-column cha xác định chiều cao cho con:

```tsx
<div id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
```

- **Trang thường** (Profile, Billing, Notifications, AdminDashboard, Home, 2 grid…): content cao hơn viewport → tràn ra và `SidebarInset` (`overflow-y-auto`) cuộn như cũ. Content thấp → `#main-content` chỉ stretch nền, vô hại.
- **Trang table opt-in:** nay có cha chiều cao xác định để `md:h-full` / `flex-1` resolve.

> ⚠️ Đây là thay đổi ở **layout dùng chung** → phải verify các trang thường không lệch (xem §7).

### 4.2 `components/list/ListPageShell` — thêm prop `fullHeight?: boolean`

```
fullHeight → "flex flex-col gap-6 md:h-full md:min-h-0"
mặc định   → "flex flex-col gap-6"   (giữ nguyên, backward-compatible)
```

### 4.3 `components/list/ListContent` — thêm prop `fullHeight?: boolean`

Khi bật: root state-wrapper thành `md:flex md:min-h-0 md:flex-1 md:flex-col` để **table card / skeleton / empty-state** đều lấp đầy vùng còn lại (empty-state có thể canh giữa dọc).

### 4.4 `ui/table.tsx` — PROJECT-PATCH (có ADR)

Thêm optional prop `containerClassName` forward vào div container cuộn; **không đổi hành vi mặc định**:

```tsx
const Table = React.forwardRef<HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { containerClassName?: string }
>(({ className, containerClassName, ...props }, ref) => (
  <div className={cn("relative w-full overflow-auto", containerClassName)}>
    <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
));
```

- **Lý do ngoại lệ:** wrap từ ngoài không fix được nested-scroll sticky; container cuộn phải là element được bound chiều cao. Đây là dạng prop shadcn upstream về sau cũng thêm.
- **Ghi `docs/adr/`** để track divergence (theo rule `components.md`). Comment `// PROJECT-PATCH: expose containerClassName for full-height sticky-scroll tables`.

### 4.5 Cleanup — component dùng chung `ListTableCard`

Gói (card border + scroll container bound + sticky header nền) vào **1 component** `components/list/ListTableCard` để 6 trang không lặp class:

```tsx
// components/list/ListTableCard/index.tsx (phác thảo)
const ListTableCard = ({ children }: { children: ReactNode }) => (
  <div className="bg-card overflow-hidden rounded-xl border md:flex md:min-h-0 md:flex-1 md:flex-col">
    {children}   // children = <Table containerClassName="md:h-full">…</Table>
  </div>
);
```

- Component chỉ layout thuần, không logic → hợp `src/components/list/`.
- Sticky header: từng `<TableHead>` (hoặc `<TableHeader>`) nhận `sticky top-0 z-10 bg-card` — nền `bg-card` khớp card để row không lộ sau header khi cuộn; `z-10` để header nổi trên row.
- `<Table containerClassName="md:h-full">` → container cuộn lấp đầy `ListTableCard` (đã bound qua flex) và tự cuộn dọc.

### 4.6 Mỗi trang table (×6)

Thay đổi tối thiểu ở mỗi `mains/*Table/index.tsx`:

1. `<ListPageShell fullHeight>` + `<ListContent fullHeight …>`.
2. Đổi khối `<div className="bg-card rounded-xl border"><Table>…</Table></div>` → `<ListTableCard><Table containerClassName="md:h-full">…</Table></ListTableCard>`.
3. Header cột: thêm `sticky top-0 z-10 bg-card` (đặt trong `ListTableCard` pattern hoặc trực tiếp trên `TableHead`).

`ListPagination` giữ nguyên, nằm sau `ListContent` như sibling `shrink-0` trong shell flex → tự ghăm đáy.

## 5. Data flow

Không đổi. Query/pagination/filter (`useListQuery`, React Query) giữ nguyên. Đây thuần là thay đổi **layout/CSS + structure JSX**, không chạm request/schema/state.

## 6. Error / edge handling

- **Loading (skeleton):** skeleton nằm trong vùng `flex-1` → lấp đầy chiều cao, không nhảy layout khi data về.
- **Empty state:** `ListContent fullHeight` cho phép empty-state canh giữa vùng còn lại (đẹp hơn dồn lên đỉnh).
- **Ít row (danh sách ngắn):** table card vẫn `flex-1` → chiếm hết chiều cao; các row ngắn nằm trên, phần dưới là nền card trống. Chấp nhận được (nhất quán khung). *(Nếu user muốn card co theo nội dung khi ít row → là biến thể, không nằm trong scope này.)*
- **Nhiều cột (horizontal overflow):** container `overflow-auto` của shadcn xử lý cuộn ngang như cũ; sticky header theo trục dọc không ảnh hưởng.
- **`<md` (mobile):** mọi ràng buộc gắn prefix `md:` → không kích hoạt; trang cuộn tài liệu tự nhiên.

## 7. Testing / Verification

- **E2E dual-gate §4.3 → SKIP (đã duyệt).** Thay đổi thuộc nhóm visual-layout/scroll-containment, assert scroll-position/viewport dễ flaky, giá trị thấp. **Không** tạo `## E2E Scenario Matrix`, không `e2e.md`.
- **SuperDesign step 1.5 → SKIP (đã duyệt).** Diện mạo table/header/pagination không đổi; chỉ đổi cơ chế cuộn — mock HTML tĩnh không thể hiện được.
- **Verify thủ công (bắt buộc trước khi báo xong):**
  1. 6 trang table ≥md: header cột sticky khi cuộn; chỉ row cuộn; pagination luôn thấy ở đáy, không phải cuộn trang.
  2. Danh sách ngắn: khung vẫn gọn viewport, không tạo scroll trang.
  3. <md (mobile): cuộn trang tự nhiên, không khóa.
  4. Trang thường (Profile, Billing, Notifications, AdminDashboard) + 2 grid (Apps, Favorites): **không regression** — cuộn như cũ.
  5. Sidebar collapse/expand + light/dark: layout không vỡ.
- **Green-checks gate §4.7 (FE):** `cd client && yarn lint && yarn build`.

## 8. Convention & skills liên quan

- `client/.claude/CLAUDE.md` (§ Custom* wrapper, list shell), rule `components.md` (immutable `ui/`, PROJECT-PATCH + ADR), `views.md`, `jsx.md`, `imports.md`.
- Skills: `standard-react`, `standard-tailwind`, `standard-shadcn`, `standard-accessibility`, `standard-frontend-engineering-mindset`.
- Design system `.claude/uiux/` (token `bg-card`, z-index, spacing) — sticky header nền dùng token `bg-card`, không hard-code màu.

## 9. Files sẽ đụng (tóm tắt)

**client/** (repo `web-store-apps`):

- `src/layouts/DashboardLayout/index.tsx` — main-content flex-fill
- `src/layouts/AdminLayout/index.tsx` — main-content flex-fill
- `src/components/list/ListPageShell/index.tsx` — prop `fullHeight`
- `src/components/list/ListContent/index.tsx` — prop `fullHeight`
- `src/components/list/ListTableCard/index.tsx` — **mới**, card+scroll+sticky
- `src/components/ui/table.tsx` — PROJECT-PATCH `containerClassName`
- 6 file `views/*/mains/*Table/index.tsx` — dùng shell mới + `ListTableCard`
- `docs/adr/` (repo docs) — ADR cho patch `ui/table.tsx`

**docs/** (repo `doc-web-app-store`):

- `specs/full-height-list-tables/design.md` — file này
- `specs/full-height-list-tables/plan.md` — output writing-plans
- `docs/adr/<n>-table-container-classname.md` — ADR patch

## 10. Non-goals (YAGNI)

- Không đổi grid (Apps, Favorites).
- Không thêm virtualization / infinite-scroll (pagination giữ nguyên).
- Không đổi API/schema/query.
- Không làm card co theo nội dung khi ít row (biến thể riêng nếu cần sau).
