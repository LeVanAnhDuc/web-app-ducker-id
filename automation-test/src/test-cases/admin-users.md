# ADMINUSERS — test case

Danh sách người dùng admin tại `/admin/users`, khoá và mở khoá tài khoản, và đặt lại mật khẩu của người dùng.
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/admin-users.md

## Danh sách — REQ-ADMINUSERS-01

### TC-ADMINUSERS-001 — Admin sees the account list with search and filters

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, session admin hợp lệ)
- **Tiền điều kiện:** các tài khoản seed
- **Bước:**
  1. Mở `/admin/users`.
- **Mong đợi:** ô tìm kiếm (trong landmark `search`), nút "Filters" và bảng
  hiển thị; `admin@test.com` và `user@test.com` có trong danh sách.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-002 — A guest is sent to sign in

- **Requirement:** REQ-ADMINUSERS-01, REQ-ADMINUSERS-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (chưa xác thực → guard → /login)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/users` khi không có session.
- **Mong đợi:** trình duyệt tới `/login`.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-003 — A non-admin gets a refusal and no account data

- **Requirement:** REQ-ADMINUSERS-01, REQ-ADMINUSERS-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (role × route)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/users` với tư cách `user@test.com`.
- **Mong đợi:** `GET /admin/users` bằng token của user trả 403; guard vai trò phía client đưa user ra khỏi
  `/admin/users` và không email nào của tài khoản khác được render.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-004 — Tampered URL params are sanitised

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, role không hợp lệ), bảng quyết định (tham số không hợp lệ + hợp lệ)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?role=xyz`, rồi `?role=xyz&search=admin`, rồi `?page=abc&role=admin`.
- **Mong đợi:** role không tồn tại bị bỏ (hiện mọi role); search hợp lệ đi kèm
  vẫn được áp dụng; `page=abc` quay về 1 và giữ `role=admin`
  (không có `user@test.com`).
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-005 — Special characters in search do not break the page

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (emoji, `%`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?search=🔍%test`.
- **Mong đợi:** bảng hoặc trạng thái "No users match" được render.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-006 — A search with no match shows the empty state

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, lớp không khớp)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?search=zzznomatch99999`.
- **Mong đợi:** "No users match" và một nút "Clear filters".
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-007 — Clear filters restores the full list

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đang lọc → đã xoá lọc)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở search không khớp, bấm "Clear filters".
- **Mong đợi:** URL mất `search=`, `admin@test.com` lại có trong danh sách.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-008 — Out-of-range page numbers render safely

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA, page 0, −1, 9999)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?page=9999`, `?page=0`, `?page=-1`.
- **Mong đợi:** 9999 hiện bảng hoặc trạng thái rỗng mà không lỗi;
  0 và −1 được coi là trang 1 (bảng có `admin@test.com`).
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-009 — Typing a search narrows the list and writes the URL

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, search có khớp)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gõ "admin" vào ô tìm kiếm của danh sách.
- **Mong đợi:** sau debounce 300 ms URL mang `search=admin`;
  `admin@test.com` có trong danh sách còn `user@test.com` thì không.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-010 — Emptying the search box restores every account

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đã tìm → search rỗng)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?search=admin`, xoá trắng ô tìm kiếm.
- **Mong đợi:** `user@test.com` lại có trong danh sách.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-011 — Changing a filter resets to page 1

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (trang 3 → đổi filter → trang 1)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?page=3`, chọn Role = Admin trong panel Filters.
- **Mong đợi:** URL mang `page=1`.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-012 — Role, status and search apply together

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (role × status × search)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?role=admin&status=active&search=admin`.
- **Mong đợi:** `admin@test.com` có trong danh sách, `user@test.com` thì không.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-013 — List state survives reload and Back

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (URL là nguồn sự thật)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?search=admin&role=admin`, tải lại trang.
  2. Từ `/admin/users`, gõ một search, bấm Back.
- **Mong đợi:** sau khi tải lại cả hai tham số và kết quả vẫn còn; Back quay
  về URL không có `search=admin`.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-014 — Roles, statuses and dates render as labels

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, giá trị enum và null)
- **Tiền điều kiện:** `unverified@test.com` chưa từng đăng nhập
- **Bước:**
  1. Mở `?role=admin`, `?status=active` và `?search=unverified@test.com`.
- **Mong đợi:** badge ghi "Admin" / "Active"; ô Last Login của tài khoản
  chưa xác minh ghi "Never"; chữ "null" / "undefined" không bao giờ xuất hiện.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-015 — English list chrome, no missing messages

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/users`.
- **Mong đợi:** nút "Filters", ô tìm kiếm tên "Search"; không có placeholder
  `[list.` / `[adminUsers.`.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-016 — Vietnamese list chrome, no missing messages

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/admin/users`.
- **Mong đợi:** nút "Bộ lọc", ô tìm kiếm có `aria-label` "Tìm kiếm"; không có
  placeholder message bị thiếu.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-017 — Toolbar is reachable and operable by keyboard

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tìm ô tìm kiếm và Filters theo role; mở panel Filters; bấm
     Escape; Tab từ ô tìm kiếm.
- **Mong đợi:** cả hai control có accessible name; Escape đóng panel; nút
  Filters vẫn nhận focus được.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-018 — The table shows the expected columns

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/users`.
- **Mong đợi:** tiêu đề cột User, Role, Status, Last Login, Created.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-019 — A failed list load is reported, not shown as "no users"

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** `GET /admin/users` bị stub thành 500
- **Bước:**
  1. Mở `/admin/users`.
- **Mong đợi:** sau hai lần retry của React Query toast "Server error.
  Please try again later." hiện ra, và trang hiện "Could not load users.
  Please try again." thay vì trạng thái rỗng "No users match".
- **Automated:** `tests/e2e/admin-users/list.e2e.ts` (từng là BUG-ADMINUSERS-01, đã sửa 2026-10-15).

### TC-ADMINUSERS-020 — A skeleton shows while the list loads

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (response chậm)
- **Tiền điều kiện:** response danh sách bị trễ 1.5 s
- **Bước:**
  1. Mở `/admin/users`.
- **Mong đợi:** hàng skeleton nhấp nháy trước, rồi tới bảng; không còn skeleton sót lại.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-021 — A finished load is announced to screen readers

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/users`.
- **Mong đợi:** `#announcer` đọc "{total} users loaded".
- **Automated:** `tests/e2e/admin-users/list.e2e.ts` (từng là BUG-ADMINUSERS-02, đã sửa 2026-10-15).

### TC-ADMINUSERS-022 — List API contract

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** các tài khoản seed
- **Bước:**
  1. `GET /api/v1/admin/users`.
- **Mong đợi:** 200 envelope `{ timestamp, path, message, data }`;
  `data.meta` `{ page: 1, limit: 20, total, totalPages = ceil(total/limit) }`;
  mỗi item có `_id` 24 ký tự hex, `role` ∈ {user, admin}, `isActive` kiểu boolean,
  `lastLoginAt`, `createdAt` hợp lệ, và không bao giờ có `password` / `authId`.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMINUSERS-023 — List query validation

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA, limit 0/1/100/101/−1, page 0/1/1.5/abc, search 200/201),
  phân vùng tương đương (EP, role, status, sortBy, sortOrder hợp lệ/không hợp lệ)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi danh sách với từng giá trị.
- **Mong đợi:** giá trị trong khoảng trả 200 (và `limit` được tôn trọng);
  giá trị ngoài khoảng hoặc không tồn tại trả 400 `VALIDATION_ERROR`.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMINUSERS-024 — Search semantics

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, email, tên, chữ hoa, không khớp, ký tự regex)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tìm `user@test.com`, `ADMIN@TEST.COM`, một tên riêng, một chuỗi vô nghĩa
     và `.*`.
- **Mong đợi:** khớp theo email hoặc tên, không phân biệt hoa thường; không khớp là
  `items: []`, `total: 0`, `totalPages: 0`; `.*` được hiểu theo nghĩa đen (không có dòng nào).
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMINUSERS-025 — Role and status filters combine

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (role × status)
- **Tiền điều kiện:** một tài khoản tạm đã bị khoá
- **Bước:**
  1. Liệt kê với từng giá trị role=admin, role=user, status=active, status=locked
     và các tổ hợp user+locked, admin+active, admin+locked.
- **Mong đợi:** mọi dòng trả về khớp mọi filter; tài khoản tạm bị khoá có trong
  user+locked và không có trong admin+locked.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMINUSERS-026 — Only admins reach the admin user endpoints

- **Requirement:** REQ-ADMINUSERS-01, REQ-ADMINUSERS-02, REQ-ADMINUSERS-03, REQ-ADMINUSERS-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest, user
- **Kỹ thuật:** bảng quyết định (role người gọi × endpoint)
- **Tiền điều kiện:** không có (id giữ chỗ)
- **Bước:**
  1. Gọi `GET /admin/users`, `PATCH …/:id/lock`, `PATCH …/:id/unlock`,
     `POST …/:id/reset-password` không có token và với token user.
- **Mong đợi:** guest 401 `AUTH_MISSING_TOKEN`; user 403 `AUTH_ADMIN_ONLY`.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMINUSERS-027 — A page past the last one is empty

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA, trang cuối, cuối + 1)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Với `limit=1`, đọc trang cuối và trang sau nó.
- **Mong đợi:** `totalPages = total`; trang cuối có 1 dòng; trang sau là
  `items: []` với `total` thật.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMINUSERS-028 — Search ignores surrounding whitespace

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (khoảng trắng đầu / cuối)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /admin/users?search=   user@test.com   `.
- **Mong đợi:** 200; `user@test.com` có trong kết quả (schema `trim` trước khi so khớp).
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMINUSERS-029 — Sort parameters order the list

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, sortBy × sortOrder, mặc định)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Liệt kê (`limit=100`) không có tham số sort, với `sortBy=createdAt&sortOrder=asc`, và với
     `sortBy=fullName` theo `asc` / `desc`.
- **Mong đợi:** mặc định mới nhất trước (`createdAt` giảm dần); `createdAt asc` tăng dần; `fullName` tăng / giảm
  dần theo code point.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMINUSERS-060 — The pager moves to the next page and keeps it in the URL

- **Requirement:** REQ-ADMINUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (trang 1 → trang 2)
- **Tiền điều kiện:** response danh sách đi qua thật nhưng `totalPages` được nâng lên tối thiểu 2 (seed có
  dưới 21 tài khoản)
- **Bước:**
  1. Mở `/admin/users`, bấm "Go to next page".
- **Mong đợi:** thanh phân trang hiện; trình duyệt gọi `GET /admin/users?page=2`; URL mang `page=2`.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMINUSERS-063 — Admin user responses carry translated messages

- **Requirement:** REQ-ADMINUSERS-01, REQ-ADMINUSERS-02, REQ-ADMINUSERS-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** i18n (en, vi), phân vùng tương đương (thành công / lỗi)
- **Tiền điều kiện:** một tài khoản tạm
- **Bước:**
  1. Gọi danh sách, khoá, mở khoá, reset tài khoản tạm; khoá id không tồn tại; khoá và reset chính mình — xen kẽ
     `Accept-Language: en` / `vi`.
- **Mong đợi:** `message` đúng chuỗi trong `server/src/i18n/locales/{en,vi}/user.json` (`success.getAdminUsers`,
  `lockUser`, `unlockUser`, `resetPassword`, `errors.notFound`, `cannotLockSelf`, `cannotResetSelf`).
- **Automated:** `tests/api/admin-users/users.api.ts`

## Khoá và mở khoá — REQ-ADMINUSERS-02

### TC-ADMINUSERS-030 — Lock an active account from the row menu

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (active → locked)
- **Tiền điều kiện:** một tài khoản tạm đang active "Lock Target"
- **Bước:**
  1. Menu dòng "User actions" → "Lock account".
  2. Xác nhận "Lock account" trong dialog "Lock Lock Target's account?".
- **Mong đợi:** toast "Account locked."; badge ghi "Locked";
  `#announcer` đọc "Lock Target's account locked.".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-031 — Unlock a locked account from the row menu

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (locked → active)
- **Tiền điều kiện:** một tài khoản tạm đã bị khoá "Unlock Target"
- **Bước:**
  1. Menu dòng → "Unlock account" → xác nhận.
- **Mong đợi:** dialog "Unlock Unlock Target's account?"; toast "Account
  unlocked."; badge ghi "Active".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-032 — A locked account cannot sign in until unlocked

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin, guest
- **Kỹ thuật:** chuyển trạng thái (active → locked → active)
- **Tiền điều kiện:** một tài khoản tạm
- **Bước:**
  1. Đăng nhập (thành công). Khoá nó. Đăng nhập lại. Mở khoá. Đăng nhập lại.
- **Mong đợi:** lần đăng nhập khi bị khoá bị từ chối với `LOGIN_ACCOUNT_INACTIVE`;
  sau khi mở khoá cùng mật khẩu đó đăng nhập được.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMINUSERS-033 — Malformed and unknown ids are refused

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (id sai định dạng, id không tồn tại)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Khoá và mở khoá `not-an-object-id` và `aaaaaaaaaaaaaaaaaaaaaaaa`.
- **Mong đợi:** 400 `VALIDATION_ERROR`; 404 `USER_NOT_FOUND`.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMINUSERS-034 — An admin cannot lock themself

- **Requirement:** REQ-ADMINUSERS-02, REQ-ADMINUSERS-05
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (tự khoá mình)
- **Tiền điều kiện:** không có; `afterEach` mở khoá admin để phòng hờ
- **Bước:**
  1. `PATCH /admin/users/<own id>/lock`.
  2. Trên UI, mở dòng của chính mình → Lock account → xác nhận.
- **Mong đợi:** 403 `ADMIN_CANNOT_LOCK_SELF`; UI hiện toast "You cannot lock
  your own account", không có toast thành công, và dòng vẫn là "Active".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`, `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMINUSERS-035 — Unlocking yourself is allowed

- **Requirement:** REQ-ADMINUSERS-02, REQ-ADMINUSERS-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (chính mình × mở khoá)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `PATCH /admin/users/<own id>/unlock`.
- **Mong đợi:** 200 `{ isActive: true }` — mở khoá không có guard chặn tự thao tác.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMINUSERS-036 — Lock outcome by target role and actor role

- **Requirement:** REQ-ADMINUSERS-02, REQ-ADMINUSERS-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin, user
- **Kỹ thuật:** bảng quyết định (role người thao tác × role đối tượng × chính mình)
- **Tiền điều kiện:** các đối tượng là tài khoản tạm; một tài khoản được nâng lên admin
- **Bước:**
  1. Admin khoá một user → 200. Admin khoá một admin khác (có hai admin active)
     → 200, rồi mở khoá. Một người không phải admin khoá một user.
- **Mong đợi:** 200 `{ _id, isActive: false }` cho cả hai thao tác của admin;
  người không phải admin nhận 403 `AUTH_ADMIN_ONLY` và đối tượng vẫn active.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMINUSERS-037 — A locked account moves between status filters

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (trạng thái × filter status)
- **Tiền điều kiện:** một tài khoản tạm đã bị khoá qua API
- **Bước:**
  1. Tìm nó dưới `status=locked`, rồi `status=active`.
- **Mong đợi:** có trong danh sách locked; "No users match" ở active.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-038 — Badge and row menu follow the account state

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, active, locked)
- **Tiền điều kiện:** một tài khoản tạm active và một đã bị khoá
- **Bước:**
  1. Mở menu của từng dòng.
- **Mong đợi:** active → badge "Active" và chỉ có "Lock account"; locked →
  badge "Locked" và "Unlock account"; không có `true` / `false` thô.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-039 — English lock dialog and toast

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** một tài khoản tạm active
- **Bước:**
  1. Khoá nó từ `/admin/users`.
- **Mong đợi:** "Lock Lock Target's account?", "The user will be unable to
  sign in until an admin unlocks the account.", toast "Account locked.".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-040 — Vietnamese lock dialog, toast and badge

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** một tài khoản tạm active
- **Bước:**
  1. Trên `/vi/admin/users`, "Thao tác với người dùng" → "Khóa tài khoản" →
     xác nhận.
- **Mong đợi:** "Khóa tài khoản của Lock Target?", "Người dùng sẽ không thể
  đăng nhập cho tới khi admin mở khóa.", toast "Đã khóa tài khoản.", badge
  "Đã khóa"; không có placeholder `[adminUsers.`.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-041 — A failed lock changes nothing on screen

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** `PATCH …/lock` bị stub thành 500
- **Bước:**
  1. Khoá một tài khoản tạm active.
- **Mong đợi:** toast "Server error. Please try again later."; nút xác nhận
  bật lại; sau khi đóng, badge vẫn ghi "Active".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-042 — Lock and unlock are idempotent

- **Requirement:** REQ-ADMINUSERS-02, REQ-ADMINUSERS-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (locked → locked, active → active)
- **Tiền điều kiện:** một tài khoản tạm đã bị khoá và một active
- **Bước:**
  1. Khoá tài khoản đã khoá; mở khoá tài khoản đang active.
- **Mong đợi:** cả hai 200 với `isActive` không đổi; dòng bị khoá vẫn
  ghi "Locked".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-043 — Confirming twice sends one request

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (submit hai lần)
- **Tiền điều kiện:** response khoá bị trễ 400 ms
- **Bước:**
  1. Xác nhận một lần khoá.
- **Mong đợi:** nút xác nhận bị vô hiệu trong lúc chờ; gửi đúng một
  PATCH; "Account locked." hiện ra.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-044 — Keyboard confirm; Cancel and Escape send nothing

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** các đối tượng là tài khoản tạm
- **Bước:**
  1. Mở menu dòng bằng Enter, xác nhận bằng Enter.
  2. Mở dialog rồi đóng bằng Cancel; lại lần nữa bằng Escape.
- **Mong đợi:** một request cho lần xác nhận bằng bàn phím; không request nào cho mỗi lần đóng.
  Focus sau khi đóng: TC-ADMINUSERS-065.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-045 — The last active admin cannot be locked

- **Requirement:** REQ-ADMINUSERS-02, REQ-ADMINUSERS-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (đối tượng = admin active cuối cùng)
- **Tiền điều kiện:** đúng một admin active, không phải người gọi
- **Bước:**
  1. Khoá admin đó.
- **Mong đợi:** 403 `ADMIN_CANNOT_LOCK_LAST_ADMIN`.
- **Automated:** manual — admin gọi lệnh luôn là một admin active ngoài đối
  tượng, nên "admin cuối cùng" duy nhất là chính người gọi, và guard tự thao tác
  trả lời trước; muốn chạm nhánh này phải vô hiệu hoá `admin@test.com`, thứ mà
  mọi spec khác phụ thuộc vào. Đã được kiểm bằng unit test `user.service` của server.

### TC-ADMINUSERS-064 — Locking a row under the Active filter removes it from the list

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (active → locked dưới filter `status=active`)
- **Tiền điều kiện:** một tài khoản tạm active
- **Bước:**
  1. Mở `?search=<email>&status=active`, khoá dòng đó từ menu dòng.
- **Mong đợi:** toast "Account locked."; danh sách tải lại, dòng biến mất và trạng thái "No users match" hiện
  (không có dòng cũ sót lại, không lỗi).
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMINUSERS-065 — Closing the lock dialog returns focus to the row menu button

- **Requirement:** REQ-ADMINUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** một tài khoản tạm active
- **Bước:**
  1. Menu dòng → "Lock account" → "Cancel".
- **Mong đợi:** dialog đóng và focus nằm trên nút "User actions" của dòng.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts` (từng là BUG-ADMINUSERS-03, đã sửa 2026-10-15).

## Đặt lại mật khẩu — REQ-ADMINUSERS-03

### TC-ADMINUSERS-050 — Reset from the row menu

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, đối tượng hợp lệ)
- **Tiền điều kiện:** tài khoản tạm "Reset Target"; POST reset bị stub thành 200
- **Bước:**
  1. Menu dòng → "Reset password" → "Send reset".
- **Mong đợi:** dialog "Reset password for Reset Target?" có nêu email;
  toast "Reset email sent."; dialog đóng; `#announcer` đọc "Password
  reset email sent to Reset Target.".
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMINUSERS-051 — No dialog before an action is chosen

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP, trạng thái ban đầu)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở danh sách.
- **Mong đợi:** không có dialog nào trên trang.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMINUSERS-052 — Reset guards: format, existence, self

- **Requirement:** REQ-ADMINUSERS-03, REQ-ADMINUSERS-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (id sai định dạng, id không tồn tại, tự reset chính mình)
- **Tiền điều kiện:** một đối tượng là tài khoản tạm
- **Bước:**
  1. Reset `not-an-object-id`, `aaaaaaaaaaaaaaaaaaaaaaaa`, id của chính mình và
     tài khoản tạm.
- **Mong đợi:** 400 `VALIDATION_ERROR`; 404 `USER_NOT_FOUND`; 403
  `ADMIN_CANNOT_RESET_SELF`; 200 `{ _id, email }`.
- **Automated:** `tests/api/admin-users/reset-password.api.ts`

### TC-ADMINUSERS-053 — Reset issues a temporary password that must be changed

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin, guest
- **Kỹ thuật:** chuyển trạng thái (mật khẩu của mình → tạm thời → reset lần nữa)
- **Tiền điều kiện:** một tài khoản tạm đăng nhập được
- **Bước:**
  1. Reset nó; đọc mật khẩu tạm thời từ email trong hàng đợi.
  2. Đăng nhập bằng mật khẩu cũ, rồi bằng mật khẩu tạm thời.
  3. Reset lần nữa; đăng nhập bằng mật khẩu tạm thời thứ nhất và thứ hai.
- **Mong đợi:** mật khẩu cũ bị từ chối (401); mật khẩu tạm thời 16 ký tự
  đăng nhập được và id token của nó mang `mustChangePassword: true`; lần
  reset thứ hai làm mật khẩu tạm thời thứ nhất mất hiệu lực.
- **Automated:** `tests/api/admin-users/reset-password.api.ts`

### TC-ADMINUSERS-054 — Dialog and toast show names, never keys

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** reset bị stub
- **Bước:**
  1. Mở dialog reset và gửi.
- **Mong đợi:** dialog chứa email của đối tượng; không có chữ `adminUsers.`.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMINUSERS-055 — English reset dialog and toast

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** reset bị stub
- **Bước:**
  1. Reset từ `/admin/users`.
- **Mong đợi:** "Reset password for Reset Target?", "The user will be
  required to set a new password on next sign-in.", "Reset email sent.".
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMINUSERS-056 — Vietnamese reset dialog and toast

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** reset bị stub
- **Bước:**
  1. Trên `/vi/admin/users`, "Đặt lại mật khẩu" → "Gửi email".
- **Mong đợi:** "Đặt lại mật khẩu cho Reset Target?", "…phải đặt mật khẩu
  mới khi đăng nhập lần tiếp theo", toast "Đã gửi email đặt lại mật khẩu.".
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMINUSERS-057 — A failed reset keeps the dialog open

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** reset bị stub thành 500
- **Bước:**
  1. Gửi một lần reset.
- **Mong đợi:** "Server error. Please try again later."; "Send reset" bật
  lại; dialog vẫn mở.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMINUSERS-058 — Sending twice sends one request

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (submit hai lần)
- **Tiền điều kiện:** reset bị stub với độ trễ 400 ms
- **Bước:**
  1. Bấm "Send reset".
- **Mong đợi:** nút bị vô hiệu trong lúc chờ; một POST.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMINUSERS-059 — Keyboard send; Cancel and Escape send nothing

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** reset bị stub
- **Bước:**
  1. Mở menu bằng Enter, gửi bằng Enter; đóng bằng Cancel và
     bằng Escape.
- **Mong đợi:** một request cho lần gửi bằng bàn phím, không request nào cho mỗi lần đóng.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMINUSERS-066 — Closing the reset dialog returns focus to the row menu button

- **Requirement:** REQ-ADMINUSERS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** tài khoản tạm "Reset Target"
- **Bước:**
  1. Menu dòng → "Reset password" → "Cancel".
- **Mong đợi:** dialog đóng và focus nằm trên nút "User actions" của dòng.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts` (từng là BUG-ADMINUSERS-03, đã sửa 2026-10-15).

### TC-ADMINUSERS-067 — An admin can reset another admin

- **Requirement:** REQ-ADMINUSERS-03, REQ-ADMINUSERS-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (role đối tượng = admin, không phải chính mình)
- **Tiền điều kiện:** một tài khoản tạm được nâng lên admin
- **Bước:**
  1. Reset nó.
- **Mong đợi:** 200 `{ _id, email }` — chỉ tự reset bị chặn, reset không có luật "admin cuối cùng".
- **Automated:** `tests/api/admin-users/reset-password.api.ts`

## Khoá mềm — REQ-ADMINUSERS-06

### TC-ADMINUSERS-061 — A locked account keeps its current access token but cannot refresh

- **Requirement:** REQ-ADMINUSERS-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin, guest
- **Kỹ thuật:** chuyển trạng thái (phiên đang mở → bị khoá)
- **Tiền điều kiện:** một tài khoản tạm đăng nhập qua API (cookie jar giữ `refreshToken`)
- **Bước:**
  1. Admin khoá tài khoản.
  2. Gọi `GET /users/me` bằng access token đã có; gọi `POST /auth/token/refresh`.
- **Mong đợi:** `/users/me` vẫn 200; refresh trả 403 `REFRESH_TOKEN_INVALID` với message
  `login.errors.invalidRefreshToken`.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

## Giới hạn tần suất — REQ-ADMINUSERS-07

### TC-ADMINUSERS-062 — Admin mutations are rate limited per admin

- **Requirement:** REQ-ADMINUSERS-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin (tài khoản tạm được nâng quyền)
- **Kỹ thuật:** giá trị biên (BVA, yêu cầu thứ 20 / 21), bảng quyết định (admin khác cùng IP)
- **Tiền điều kiện:** một tài khoản tạm được nâng lên admin, bộ đếm `rate-limit:admin-user-mutation:*` đã xoá
- **Bước:**
  1. Gửi 20 lần khoá / mở khoá / reset xen kẽ lên một id không tồn tại.
  2. Gửi lần thứ 21; rồi `admin@test.com` khoá cùng id đó.
- **Mong đợi:** 20 lần đầu 404 `USER_NOT_FOUND` (không gì bị thay đổi); lần 21 trả 429 `TOO_MANY_REQUESTS` với
  message `user.errors.rateLimitExceeded`; admin khác vẫn qua được limiter (404).
- **Automated:** `tests/api/admin-users/rate-limit.api.ts`
