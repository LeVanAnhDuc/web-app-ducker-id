# E2E — List Table Column Controls (AdminApps sort / width / hideBelow)

**Trang**: `/admin/apps` (heading "App Registry"). **Project Playwright**: `admin` (auth admin). **Test file**: `client/e2e/admin-apps/list-table-column-controls/list-table-column-controls.e2e.ts` (đặt dưới `admin-apps/` để khớp regex admin project — không cần sửa `playwright.config.ts`).

**Seed deps**: cần **≥ 2 app** trong seed để assert thứ tự sort (server/src/database/seeders/data/web-apps.ts có `blog`, `notes`, … → thỏa). Sort là **client-side, read-only** — KHÔNG ghi DB → không cần revert.

**Cột**: `App`(sortable, width 28%), `Last Updated`(sortable), `Category`(hideBelow sm), `Redirect URIs`(hideBelow md), `Status`, `Required Roles`.

## Scenario → test mapping

| #   | Scenario                                                                                                              | Test? | Gate    |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----- | ------- |
| 1   | Happy: click "App" → asc theo displayName + `aria-sort="ascending"` + icon; click lại → desc                        | ✅    | A+B     |
| 6a  | Toggle 2-state: unsorted→asc→desc→asc trên "App"                                                                    | ✅    | A+B     |
| 6b  | **[ST invalid]** switch cột: đang sort "App" → click "Last Updated" → "App" mất `aria-sort` (=none), "Updated"=asc  | ✅    | A+B     |
| 7a  | URL persist: sau sort `page.url()` chứa `sortBy=app&sortOrder=asc`; `reload()` giữ `aria-sort`                       | ✅    | A+B     |
| 7b  | **[deep-link]** goto `/admin/apps?sortBy=app&sortOrder=desc` trực tiếp → load ra desc + `aria-sort="descending"`    | ✅    | A+B     |
| 7c  | **[DT]** filter status=active + sort "Last Updated" → sort áp trên tập đã lọc (không reset filter)                   | ✅    | A+B     |
| 4a  | **[EP]** `?sortBy=status` (cột không có accessor) → không reorder, không crash, bảng vẫn render                     | ✅    | A+B     |
| 4b  | **[EP]** `?sortBy=___bogus` (rác) → không reorder, không crash                                                      | ✅    | A+B     |
| 4c  | **[EP]** `?sortBy=app&sortOrder=sideways` (order rác) → `undefined` → không sort                                    | ✅    | A+B     |
| 12a | a11y: header sort là `role="button"` name /sort by/i; focus + `Enter` → sort đổi (`aria-sort` cập nhật)             | ✅    | A+B     |
| 12b | a11y: chỉ **đúng 1** cột có `aria-sort` ≠ "none" tại một thời điểm                                                   | ✅    | A+B     |
| 9   | i18n: lặp scenario happy ở locale **vi** (`/vi/admin/apps`), aria-label nút = /sắp xếp theo/i                       | ✅    | A+B     |
| R   | **[BVA]** responsive: viewport 639 → "Category" ẩn; 640 → hiện. 767 → "Redirect URIs" ẩn; 768 → hiện               | ✅    | B (visual) |
| 5   | Empty: filter cho 0 app → empty state; click sort header khi rỗng không crash                                        | ✅    | A+B     |
| 2   | AuthN: unauth → /login (guard, verify không regress)                                                                 | ✅    | B       |
| 3   | AuthZ: non-admin gọi API admin apps → 403 (đã cover ở `admin-authz/` suite hiện có — KHÔNG nhân bản)                | reuse | A       |
| 8   | Data render: sau sort, category = tên (không id), Last Updated format (không ISO thô)                                | ✅    | A+B     |
| 10  | Loading skeleton (verify không regress); 5xx error UI                                                                | reuse | B       |
| 11  | Mutation safety — **N/A**: sort client-side, không ghi DB.                                                           | —     | —       |

## Gotcha folded từ completeness-critic seed (critic 529 — tự bổ sung)

- **Deep-link pre-set sort trên first load** → 7b (aria-sort đúng ngay khi load, không cần click).
- **Back-button giữ sort** → nằm trong 7a (URL-driven → history back khôi phục sort; verify optional nếu flaky).
- **Double-click nhanh** → toggle vẫn về trạng thái nhất quán (6a đã walk asc→desc→asc; double-click = 2 lần toggle).
- **sortable ∩ hideBelow**: KHÔNG có cột nào vừa sortable vừa hideBelow (app/updatedAt sortable; category/redirectUris hideBelow) → không có case "nút sort biến mất theo breakpoint". Ghi nhận là quyết định thiết kế, không cần test.
- **Sort khi đang loading**: header sort chỉ render sau khi data về (ListContent hiện skeleton lúc loading, không có header) → không có race click-during-skeleton.
- **`aria-sort` chỉ 1 cột active** → 12b.

## Follow-up gaps

- Nếu seed thay đổi còn < 2 app → test thứ tự defer (ghi lý do ở đây), giữ các case URL/aria/render.
- Back-button history assertion để optional (dễ flaky theo timing router) — ưu tiên deep-link 7b thay thế.
