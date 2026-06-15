# E2E Scenarios — Unified List Experience

> Expanded from `## E2E Scenario Matrix` in `design.md`.
> Representative page (unified shell): **Admin Users** (`/admin/users`, server-side filtering) → `client/e2e/unified-list/admin-users.e2e.ts`.
> Auth: runs under `chromium` project (`e2e/.auth/user.json`). Admin-route tests require `E2E_USER_EMAIL=admin@test.com` in env (same convention as `admin-users-list` suite). Unauthenticated tests use `test.use({ storageState: { cookies: [], origins: [] } })`.

> **Post-merge reconciliation (favorite-apps integration).** When this branch merged latest `origin/main`, the `favorite-apps` feature had replaced the **Favorites** (and `/apps`) mock data with the real favorites API (`useFavorites`/`useToggleFavorite`, real categories, `AppCard` hearts). The unified-list migration was therefore re-applied on top of the real-API views. Consequently:
> - **Favorites is now server-side (real API), not client-side.** Its E2E coverage lives in the real-API suites `client/e2e/favorite-apps/*.e2e.ts` (favorites-page / toggle / i18n / auth), reconciled to the unified toolbar (search via `role="search"` landmark, category via the **Filters popover** Select instead of pills, URL-driven filter state).
> - **`client/e2e/unified-list/favorites.e2e.ts` was retired** (it asserted the pre-merge mock catalog/categories, which no longer exist). The unified-shell pattern is still represented by `admin-users.e2e.ts` (server-side) and exercised on `/apps` + `/favorites` via the `favorite-apps` + `web-app-user-list` suites.
> - `/apps` catalog coverage: `client/e2e/web-app-user-list/apps-list.e2e.ts`.

---

## Scenario Matrix (with test status)

| # | Category | Status | Scenario + expected | Gate | Test Status | Notes |
|---|----------|--------|---------------------|------|-------------|-------|
| 1 | Happy path | ✅ | Admin mở `/admin/users` → thấy danh sách + toolbar (search + nút Filters) + pagination. User thường mở `/apps` → grid + toolbar. Render đúng theo `useListQuery` đọc URL rỗng (defaults). | A+B | **Covered** | `admin-users.e2e.ts` "happy path" + `favorites.e2e.ts` "happy path" |
| 2 | AuthN | ✅ | Truy cập `/admin/users` khi chưa đăng nhập → redirect login (AuthGuard). | A+B | **Covered** | `admin-users.e2e.ts` "unauthenticated" describe block |
| 3 | AuthZ | ✅ **[DT]** | role × route: `user`→`/admin/*` = 403/redirect; `admin`→thấy đầy đủ. DT: (role=user, route=admin)→chặn · (role=admin, route=admin)→cho · (role=user, route=dashboard)→cho. | A+B | **Covered** | `admin-users.e2e.ts` "authZ" test with user storageState |
| 4 | Validation / expected-error | ✅ **[EP][DT]** | URL params tampered. **[EP]** `role`: hợp lệ(`admin`) · rỗng · lạ(`xyz`→bỏ qua, dùng all). `search`: rỗng · chuỗi thường · ký tự đặc biệt/`%`/emoji (không vỡ). **[DT]** combo: `role=xyz`(invalid) + `search=abc`(valid) → bỏ role, giữ search; `page=abc`(invalid) + `role=admin`(valid) → page về 1, giữ role. | A+B | **Covered** | `admin-users.e2e.ts` "validation / URL tampered params" describe block |
| 5 | Empty / null states | ✅ | Search no-match → `<ListEmptyState>` "không khớp" + nút Clear filters (vì filter active). List rỗng thật (seed 0) → empty message + CTA. Field null (`lastLoginAt`) → "Never", không phải `null`. | A+B | **Covered** | `admin-users.e2e.ts` "empty / no-match state" + "data rendering" |
| 6 | Boundary / pagination | ✅ **[BVA]** | `page`: `1`(first, Prev disabled) · `last`(Next disabled) · `last+1`/beyond-range → clamp về last hoặc empty an toàn · `0`/`-1`/`abc` → về 1. `limit`: dưới min / trên max → clamp default. Sort toggle asc↔desc đổi thứ tự + URL `sortOrder`. | A+B | **Partially covered** | `page=9999` (beyond range) and `page=abc` covered; `page=0`/`page=-1` covered; sort toggle **deferred** — no sort UI on Admin Users page (sortBy/sortOrder not wired to column headers in current implementation) |
| 7 | Filter / search | ✅ **[EP][DT][ST]** | **[EP]** search: match→kết quả lọc · no-match→empty · clear→full lại. **[DT]** combo filter: `role=admin`+`status=active`+`search=foo` → AND tất cả; mỗi tổ hợp ra tập đúng. **[ST]** đổi filter khi đang ở page 3 → **reset về page 1** (transition). Mọi filter/search **persist trong URL** (reload giữ nguyên). | A+B | **Covered** | `admin-users.e2e.ts` "filter / search" describe block; search debounce via `waitForURL` |
| 8 | Data rendering | ✅ | Hiển thị label người-đọc-được, không enum thô: status badge ("Active" không phải `active`), role ("Admin"), ngày format (không ISO/`null`). | A+B | **Covered** | `admin-users.e2e.ts` "data rendering" — checks role badge "Admin", status badge "Active", null lastLoginAt → "Never" |
| 9 | **i18n** | ✅ | Render trạng thái chính ở **CẢ en + vi**: toolbar (Search/Filters/Clear), empty state, "Page X of Y", filter labels, preset date (Today/Last 7…). Bắt missing-message. | A+B | **Covered** | `admin-users.e2e.ts` + `favorites.e2e.ts` both have i18n describe blocks; assert "Filters" (en) vs "Bộ lọc" (vi) using actual values from `src/locales/*/list.json` |
| 10 | Error / loading | ✅ | API list trả 5xx/network error → error UI (không silent). Lúc đang load lần đầu → Skeleton trong `<ListContent>`. | A+B | **Deferred** | Requires route interception (`page.route`) to simulate network error; deferred as lower-priority given server-side rendering constraints. Loading skeleton is transient and hard to assert reliably without artificial delay. Tag for follow-up. |
| 11 | Mutation safety | ✅ **[ST]** | Feature list/search **không tạo mutation mới**. **[ST]** đổi filter nhanh liên tục (rapid toggle) → URL cuối đúng, không race; **back button** sau khi filter → khôi phục URL trước; double-submit search (debounce) → chỉ 1 lần đẩy URL. KHÔNG mutate dữ liệu. | A+B (read/render only) | **Partially covered** | Back-button URL restore covered in `admin-users.e2e.ts`. Rapid-toggle race deferred (requires timing-sensitive test). Double-submit debounce covered implicitly by debounce test. |
| 12 | Accessibility | ✅ | Selector role/label: nút Filters có `aria-label` + badge count đọc được; Popover trap focus + Escape đóng; search input có label; thứ tự keyboard tab hợp lý; `useAnnounce` thông báo khi kết quả đổi. | A+B | **Covered** | `admin-users.e2e.ts` + `favorites.e2e.ts` a11y blocks; check `getByRole('searchbox')` accessible name, `getByRole('button', { name: /Filters/i })` accessible name, Popover Escape close |

---

## Deferred scenarios (reasons)

| Scenario | Reason |
|----------|--------|
| Row 6 — sort toggle asc↔desc | No sort UI present on Admin Users page (`sortBy`/`sortOrder` not wired to column headers in current implementation scope). Can be added when sort columns are implemented. |
| Row 10 — error UI (5xx/network) | Requires `page.route()` mock to simulate network failure; deferred to avoid coupling E2E to network interception complexity. Also loading skeleton is transient. |
| Row 11 — rapid-toggle race | Timing-sensitive; deterministic assertion difficult. The hook's ref-guarded debounce makes this low-risk. |
| Row 6 — `page=0` / `page=-1` | `parsePage` in `useListQuery` treats these as `page=1`; covered by URL navigation test that asserts table still renders. |
| DateRange custom preset | `DateRangeFilter` defers custom from/to inputs (plan.md Task 5 YAGNI). No test for custom dateRange. |
| Favorites pagination | Post-merge, Favorites is real-API but the favorites endpoint returns an unpaginated list (no `meta.pagination`) and `FavoritesGrid` renders no `ListPagination`. Pagination boundary test N/A. Coverage now in `favorite-apps/favorites-page.e2e.ts` (count 0/1/many). |

---

## Selector / a11y follow-ups

- **Follow-up:** `SearchInput` component renders a `<input>` — confirm `ariaLabel` prop flows to `aria-label` attribute so `getByRole('searchbox', { name: /Search/ })` resolves. If not, add `data-testid="list-search-input"` without modifying app source (flag for developer).
- **Follow-up:** Filters popover badge (`activeFilterCount`) is inside a `<span>` without `aria-label`; screen-reader announcement comes from `useAnnounce`. Verify with `browser_snapshot` in Gate B that the badge text is accessible.
- **Follow-up:** `ListToolbar` wraps toolbar in `role="search"` — confirm `getByRole('search')` locates the toolbar region in Gate B MCP walk.

---

## Gate assignment

All scenarios: **A+B** (read-heavy feature, no mutations in scope).
`A only` column: none — confirmed by design.md ("Feature list/search không tạo mutation mới").

---

## Auth context for Gate B (MCP walk)

Gate B must use a **separate auth context** (clear cookies + no storageState) to avoid contaminating Gate A's session. Login fresh as admin via API before walking admin-route scenarios.
