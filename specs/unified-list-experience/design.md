# Design — Unified List Experience

> Status: approved (brainstorming). Next: Pencil mockups (step 1.5) → `superpowers:writing-plans`.
> Feature name: `unified-list-experience`

## 1. Problem

Search, filter và cách trình bày trang list/table hiện **không đồng nhất** giữa các trang. Khảo sát 8 trang có search/filter cho thấy:

- **Search — 4 cơ chế khác nhau**: URL tức thì không debounce (Admin Users/Apps); debounce + local state, không sync URL (Dashboard Apps); React Hook Form + nút Apply (Admin Contact); local state thuần (Favorites).
- **Filter — 3 cơ chế nộp**: tức thì onChange (Admin Users/Apps/Login History); nút "Apply" gom tất cả (Admin Contact, 7 filter); local state không sync URL (Favorites, Apps categories).
- **Trình bày trang lệch nhau**: chỉ Admin Users dùng `<TablePagination>`, còn lại tự ghép tay `<CustomPagination>`; empty state mỗi nơi một kiểu; toolbar chỗ inline, chỗ tách nhiều file filter; date range chỗ from/to (Admin Contact), chỗ preset (Login History).

Hệ quả: trải nghiệm không nhất quán, code trùng lặp, dễ drift tiếp.

## 2. Goal & Scope

**Goal**: một concept chung duy nhất cho mọi trang list/table — cả search/filter LẪN cách trình bày trang (header/toolbar/content/pagination/empty/loading).

**Quyết định cốt lõi (đã chốt với user)**:

| Trục | Quyết định |
| --- | --- |
| Phạm vi | **Tất cả 8 trang list/table** (cả search/filter lẫn presentation) |
| Source of truth state | **URL query params** (toàn bộ: search/filter/page/sort) |
| Filter apply | **Tức thì onChange**; search debounce 300ms |
| Abstraction | **Component + hook dùng chung** (`useListQuery` + bộ shell) |
| Date range | **Preset + custom** (All/Today/Last 7/30/90/Custom→from-to) |
| Filter layout | Nút **"Filters" (badge đếm active) → Popover/Sheet** |

**Trang trong scope**: Admin Users, Admin Apps, Admin Contact, Admin Login History, Admin Entitlements, Dashboard Apps, Favorites, Dashboard Login History.

**Out of scope (YAGNI)**: không đổi API contract BE; không thêm mutation mới; không đổi business logic của từng trang; chỉ chuẩn hóa cơ chế list/search/filter/presentation ở FE.

## 3. Architecture

### 3.1 Hook trung tâm — `useListQuery` (`src/hooks/useListQuery.ts`)

Một nguồn chân lý duy nhất, đọc/ghi **URL query params**:

- **State đọc từ URL**: `search`, `page`, `limit`, `sortBy`, `sortOrder`, `filters` (map động `{ [key]: string }`).
- **Search**: giữ giá trị gõ tức thì trong state nội bộ (input phản hồi ngay) + **debounce 300ms** trước khi đẩy vào URL (`useDebouncedValue` có sẵn).
- **API**: `setSearch`, `setFilter(key, value)`, `clearFilters`, `setPage`, `setSort`, `setLimit` — tất cả `router.push` URL mới; **reset `page=1`** khi search/filter đổi.
- **Validation**: nhận `filterDefs` (config khai báo) → validate giá trị URL theo allow-list mỗi filter; giá trị lạ/tampered bị bỏ qua, không crash.
- **`activeFilterCount`**: đếm filter khác rỗng → hiện badge trên nút Filters.
- **a11y**: gọi `useAnnounce` khi search/filter/page đổi (tái dùng pattern hiện có).

Navigation dùng `useRouter`/`usePathname` từ `@/i18n/navigation`; đọc params bằng `useSearchParams` từ `next/navigation` (đúng rule imports của client CLAUDE.md).

### 3.2 Bộ shell components (`src/components/list/`)

| Component | Vai trò |
| --- | --- |
| `<ListPageShell>` | Khung trang chuẩn `flex flex-col gap-6` bọc header + toolbar + content + pagination. |
| `<ListPageHeader>` | `<PageTitle>` + description (wrapper `flex flex-col gap-1.5`) + vùng action primary bên phải. |
| `<ListToolbar>` | `SearchInput` (trái) + nút **"Filters"** (badge `activeFilterCount`) → Popover/Sheet + slot tùy chọn (vd view toggle grid/list). |
| `<ListFilterPanel>` | Nội dung Popover/Sheet: render filter từ config + nút **Clear all**. Áp dụng **tức thì onChange**. |
| `<DateRangeFilter>` | Dropdown preset (All/Today/Last 7/30/90/Custom); Custom → 2 `CustomDateInput` from/to; ghi `fromDate`/`toDate` (+ `dateRange` preset key) vào URL. |
| `<ListContent>` | Vùng nội dung tự xử lý 3 state: **loading** (Skeleton) · **empty** (`<ListEmptyState>`) · **data** (children: table HOẶC grid). |
| `<ListEmptyState>` | Icon + title + description + action. Có filter active → message "không khớp" + nút **Clear filters**; rỗng thật → message + CTA. |
| `<ListPagination>` | Chuẩn hóa: page info ("Page X of Y · N results") + `<CustomPagination>`. Thay `<TablePagination>` + các bản ghép tay. |

Tất cả tuân design system `.claude/uiux/` (token `frontend-reference.md`, icon `icon-map.md`, copy `ux-copy.md`); **không** sửa `components/ui/*`, chỉ compose qua `Custom*`/shell mới.

### 3.3 Filter declarative config

Mỗi trang khai báo filter dạng data (trong `src/dataSources/<Feature>/`), `<ListFilterPanel>` tự render:

```ts
type ListFilterDef =
  | { key: string; type: "select"; label: string; options: { value: string; label: string }[]; allLabel?: string }
  | { key: string; type: "dateRange"; label: string }   // → <DateRangeFilter>; ghi fromDate/toDate
  | { key: string; type: "text"; label: string; placeholder?: string }; // debounce như search
```

`options` lấy từ `dataSources` hiện có (`APP_STATUSES`, `CONTACT_CATEGORY_VALUES`…) hoặc nạp động (vd categories của Admin Apps qua React Query) — panel hỗ trợ `options` async qua render-prop khi cần. Mọi label/placeholder/empty message qua next-intl (namespace dùng chung `list` cho chuỗi shared: Filters, Clear, Page X of Y, No results…).

## 4. Data flow

```
URL query params  ←──(router.push)── useListQuery (setSearch/setFilter/setPage/setSort)
       │                                      ▲
       ▼                                      │ (user gõ/chọn — onChange tức thì, search debounce 300ms)
useSearchParams → query object → React Query (useUsers/useApps/…) → API proxy → BE
       │
       ▼
<ListContent>: isLoading→Skeleton · data rỗng→<ListEmptyState> · có data→table/grid
```

- **Search**: gõ → state nội bộ (input hiện ngay) → debounce 300ms → `setSearch` đẩy URL → refetch.
- **Filter/sort/page**: onChange → đẩy URL ngay (filter/search reset `page=1`).
- **Trang client-side (Favorites mock)**: vẫn dùng `useListQuery` đọc URL, nhưng lọc bằng `useMemo` thay vì gọi API — **cùng concept URL**, khác nguồn dữ liệu.

## 5. Migration từng trang (giữ chức năng, đổi cơ chế)

| Trang | Thay đổi chính |
| --- | --- |
| Admin Users / Apps | Toolbar inline Select → `<ListToolbar>` + Filters popover (config-driven); thêm debounce search; dùng `<ListPagination>`. |
| Admin Contact | Bỏ RHF + nút Apply → filter **tức thì** trong popover; from/to → `<DateRangeFilter>`; xóa 7 filter component lẻ. |
| Admin Login History | Dropdown filter → popover config-driven; preset date giữ qua `<DateRangeFilter>`. |
| Dashboard Login History | Tương tự; chuẩn hóa pagination/empty. |
| Admin Entitlements | Search inline trong table → toolbar chuẩn; giữ lọc client-side qua `useMemo`. |
| Dashboard Apps | Local state → URL; category chips giữ làm slot toolbar tùy chọn; view toggle grid/list = slot; `<ListContent>` bọc grid. |
| Favorites | Local state → URL (client-side filter); dùng shell + empty state chuẩn. |

## 6. Edge cases & nguyên tắc

- **URL invalid/tampered** (`role=xyz`, `page=abc`): validate qua allow-list trong `useListQuery` → bỏ qua giá trị lạ, fallback default; không crash.
- **a11y**: mọi đổi filter/search/page gọi `useAnnounce`; nút Filters có `aria-label` + badge; Popover trap focus (shadcn).
- **i18n**: en + vi; namespace `list` cho chuỗi shared.
- **Reduced motion / dark mode**: theo semantic token sẵn có.
- **Không sửa `components/ui/*`** — compose qua `Custom*`/shell mới.
- **Không env var mới, không đổi Mongoose schema/seed** (FE-only) → không kích hoạt §5 step 3.1/3.2.

## 7. Components / units & interfaces (isolation)

- `useListQuery(filterDefs)` — input: filter config; output: `{ search, filters, page, sortBy, sortOrder, activeFilterCount, setSearch, setFilter, clearFilters, setPage, setSort, setLimit }`. Phụ thuộc: URL (next-intl navigation + useSearchParams). Test độc lập qua mock URL.
- Shell components — input: props/slots; không tự fetch (nhận data + handlers từ trang). Thay đổi nội bộ không phá consumer.
- `ListFilterDef` config — interface dữ liệu giữa trang và `<ListFilterPanel>`.

---

## E2E Scenario Matrix

> Feature đụng `client/src/**` và đổi behavior user thấy được (toolbar/popover/URL state/empty/pagination) → matrix bắt buộc. Trọng tâm **filter/search** và **boundary/pagination** (cốt lõi). Trang đại diện để walk: **Admin Users** (server-side, nhiều filter) + **Favorites** (client-side) — cùng concept, hai nguồn dữ liệu.
>
> `Gate` mặc định `A+B`. Feature read-heavy (list/search/filter) → hầu như không mutation → ít `A only`.

| # | Category | Status | Scenario + expected | Gate |
| --- | --- | --- | --- | --- |
| 1 | Happy path | ✅ | Admin mở `/admin/users` → thấy danh sách + toolbar (search + nút Filters) + pagination. User thường mở `/apps` → grid + toolbar. Render đúng theo `useListQuery` đọc URL rỗng (defaults). | A+B |
| 2 | AuthN | ✅ | Truy cập `/admin/users` khi chưa đăng nhập → redirect login (AuthGuard). | A+B |
| 3 | AuthZ | ✅ **[DT]** | role × route: `user`→`/admin/*` = 403/redirect; `admin`→thấy đầy đủ. DT: (role=user, route=admin)→chặn · (role=admin, route=admin)→cho · (role=user, route=dashboard)→cho. | A+B |
| 4 | Validation / expected-error | ✅ **[EP][DT]** | URL params tampered. **[EP]** `role`: hợp lệ(`admin`) · rỗng · lạ(`xyz`→bỏ qua, dùng all). `search`: rỗng · chuỗi thường · ký tự đặc biệt/`%`/emoji (không vỡ). **[DT]** combo: `role=xyz`(invalid) + `search=abc`(valid) → bỏ role, giữ search; `page=abc`(invalid) + `role=admin`(valid) → page về 1, giữ role. | A+B |
| 5 | Empty / null states | ✅ | Search no-match → `<ListEmptyState>` "không khớp" + nút Clear filters (vì filter active). List rỗng thật (seed 0) → empty message + CTA. Field null (`lastLoginAt`) → "Never", không phải `null`. | A+B |
| 6 | Boundary / pagination | ✅ **[BVA]** | `page`: `1`(first, Prev disabled) · `last`(Next disabled) · `last+1`/beyond-range → clamp về last hoặc empty an toàn · `0`/`-1`/`abc` → về 1. `limit`: dưới min / trên max → clamp default. Sort toggle asc↔desc đổi thứ tự + URL `sortOrder`. | A+B |
| 7 | Filter / search | ✅ **[EP][DT][ST]** | **[EP]** search: match→kết quả lọc · no-match→empty · clear→full lại. **[DT]** combo filter: `role=admin`+`status=active`+`search=foo` → AND tất cả; mỗi tổ hợp ra tập đúng. **[ST]** đổi filter khi đang ở page 3 → **reset về page 1** (transition). Mọi filter/search **persist trong URL** (reload giữ nguyên). | A+B |
| 8 | Data rendering | ✅ | Hiển thị label người-đọc-được, không enum thô: status badge ("Active" không phải `active`), role ("Admin"), ngày format (không ISO/`null`). | A+B |
| 9 | **i18n** | ✅ | Render trạng thái chính ở **CẢ en + vi**: toolbar (Search/Filters/Clear), empty state, "Page X of Y", filter labels, preset date (Today/Last 7…). Bắt missing-message. | A+B |
| 10 | Error / loading | ✅ | API list trả 5xx/network error → error UI (không silent). Lúc đang load lần đầu → Skeleton trong `<ListContent>`. | A+B |
| 11 | Mutation safety | ✅ **[ST]** | Feature list/search **không tạo mutation mới** (mutation row-action vẫn ở dialog cũ, ngoài scope). State-safety của chính concept: **[ST]** đổi filter nhanh liên tục (rapid toggle) → URL cuối đúng, không race; **back button** sau khi filter → khôi phục URL trước (transition hợp lệ); double-submit search (debounce) → chỉ 1 lần đẩy URL. KHÔNG mutate dữ liệu. | A+B (read/render only) |
| 12 | Accessibility | ✅ | Selector role/label: nút Filters có `aria-label` + badge count đọc được; Popover trap focus + Escape đóng; search input có label; thứ tự keyboard tab hợp lý; `useAnnounce` thông báo khi kết quả đổi. | A+B |

**Completeness critic**: sẽ chạy ở `writing-plans` (1 subagent tìm case thiếu) nếu user yêu cầu "thorough/đủ". Common gotchas cần soi: paste search có khoảng trắng đầu/cuối, autofill, emoji trong search, session hết hạn giữa lúc đổi filter, mở 2 tab đổi filter song song, URL share giữa user khác locale.

**Mutation-heavy `A only`**: không có ở concept này (read-heavy). Nếu khi migration phát sinh case đụng mutation thật → tag `A only` lúc viết `e2e.md`.
