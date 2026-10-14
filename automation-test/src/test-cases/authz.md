# AUTHZ — test case

Kiểm soát truy cập: guest bị chặn, non-admin bị từ chối ở mọi trang và endpoint admin, và trang landing `/admin` (REQ-AUTHZ-01…03).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/authz.md

### TC-AUTHZ-001 — A non-admin opening an admin page never sees admin data

- **Requirement:** REQ-AUTHZ-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (vai trò user × route users / apps / login-history / categories / contact / entitlements)
- **Tiền điều kiện:** session của `user@test.com` đã seed
- **Bước:**
  1. Mở từng trang danh sách admin.
  2. Gọi endpoint mà trang đọc, kèm Bearer token của user.
- **Mong đợi:** URL vẫn ở route admin (không có guard phía client), trang
  dừng ở trạng thái rỗng ("No users match", "No apps registered yet.",
  "No login history found", "No categories yet", "No contact requests found";
  bộ chọn entitlement trả lời "No users found"), `admin@test.com` không bao giờ
  được render, và endpoint trả 403 `AUTH_ADMIN_ONLY`.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`

### TC-AUTHZ-002 — A non-admin cannot lock, unlock or reset an account

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (vai trò user × thao tác lock / unlock / reset-password)
- **Tiền điều kiện:** một ObjectId giữ chỗ làm đích — `adminGuard` chạy trước mọi lookup
- **Bước:**
  1. `PATCH /admin/users/:id/lock`, `PATCH …/unlock`, `POST …/reset-password` với token của user.
- **Mong đợi:** mỗi lời gọi trả 403 `AUTH_ADMIN_ONLY` — không bao giờ `ADMIN_CANNOT_LOCK_SELF` hay 404.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-003 — Token-less admin mutations are refused with 401

- **Requirement:** REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — không có header `Authorization`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `PATCH /admin/users/:id/lock` và `POST /admin/users/:id/reset-password` không kèm token.
- **Mong đợi:** 401 `AUTH_MISSING_TOKEN`.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-004 — Every admin category endpoint: user 403, guest 401

- **Requirement:** REQ-AUTHZ-01, REQ-AUTHZ-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user, guest
- **Kỹ thuật:** bảng quyết định (vai trò × GET list / POST / PATCH / POST move / GET delete-impact / DELETE)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi từng endpoint `/api/v1/admin/categories*` với tư cách user, rồi không kèm token.
- **Mong đợi:** mọi ô là 403 `AUTH_ADMIN_ONLY` với user và 401 với guest.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-005 — The public category list stays open

- **Requirement:** REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** user, guest
- **Kỹ thuật:** bảng quyết định (hàng đối chứng cho endpoint public)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api/v1/apps/categories` với tư cách user và guest.
- **Mong đợi:** cả hai đều 200 — chỉ `/admin/*` có guard.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-006 — A guest opening /admin/categories is sent to login

- **Requirement:** REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không có session → login)
- **Tiền điều kiện:** một context không có cookie
- **Bước:**
  1. Mở `/admin/categories`.
- **Mong đợi:** trình duyệt dừng ở `/login`.
- **Automated:** `tests/e2e/authz/guest-redirect.e2e.ts`

### TC-AUTHZ-007 — Every admin endpoint answers a guest with 401

- **Requirement:** REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** bảng quyết định (vai trò guest × toàn bộ 20 endpoint admin)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gửi từng method + path `/api/v1/admin/*` (users, login-history, contacts, apps, categories, entitlements) không kèm token, với id giữ chỗ và body rỗng.
- **Mong đợi:** mọi lời gọi đều 401 `AUTH_MISSING_TOKEN`.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-008 — Every admin endpoint answers a regular user with 403

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (vai trò user × toàn bộ 20 endpoint admin)
- **Tiền điều kiện:** Bearer token của user
- **Bước:**
  1. Gửi đúng 20 lời gọi như TC-AUTHZ-007 với token của user.
- **Mong đợi:** mọi lời gọi đều 403 `AUTH_ADMIN_ONLY` — không lời gọi nào tới được bước validation (không có 400) hay service (không có 404).
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-009 — A forged or malformed token is refused

- **Requirement:** REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (JWT rác / Bearer rỗng / scheme Basic / JWT không ký `alg: none` tự nhận `admin`), đoán lỗi (Error Guessing)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api/v1/admin/users` với từng header.
- **Mong đợi:** không có Bearer dùng được (rỗng, Basic) → 401 `AUTH_MISSING_TOKEN`; Bearer không qua được bước xác minh (rác, không ký) → 403 `JWT_INVALID` (`verifyToken` ném `ForbiddenError`); claim admin không ký không bao giờ được tin.
- **Automated:** `tests/api/authz/tokens.api.ts`

### TC-AUTHZ-010 — An admin gets past both guards on every admin endpoint

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (hàng đối chứng — chứng minh 401/403 ở trên đến từ vai trò, không phải từ request)
- **Tiền điều kiện:** Bearer token của admin
- **Bước:**
  1. Gửi đúng 20 lời gọi như TC-AUTHZ-007 với tư cách admin.
- **Mong đợi:** không lời gọi nào là 401 / 403 hay 5xx (danh sách trả 200; id giữ chỗ / body rỗng trả 400 hoặc 404). Không có gì bị thay đổi.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-011 — The denial uses the error envelope and is translated

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương trên `Accept-Language` (en / vi)
- **Tiền điều kiện:** Bearer token của user
- **Bước:**
  1. `GET /api/v1/admin/apps` với `Accept-Language: en`, rồi `vi`.
- **Mong đợi:** body có `code`, `message`, `timestamp`, `path` (`/api/v1/admin/apps`); message là "Forbidden access" với en và "Truy cập bị từ chối" với vi.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-012 — The Bull Board queue dashboard requires an admin

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — bề mặt admin nằm ngoài `/api/v1`)
- **Tiền điều kiện:** API chạy cùng Redis (queue bật)
- **Bước:**
  1. Không có session nào, `GET /admin/queues` trên **API origin** (`:5000`).
- **Mong đợi:** 401 / redirect về login. **Thực tế (2026-10-10): 200 — dashboard
  được mount trong `server/src/loaders/queue.loader.ts` không có guard, nên ai
  tới được API cũng đọc và retry được email job.** Bug đang mở, bằng chứng
  `curl http://localhost:5000/admin/queues` → 200.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts` (gọi API origin qua `API_URL`; đánh dấu `test.fail()` tới khi sửa)

### TC-AUTHZ-013 — A guest opening any admin page lands on login

- **Requirement:** REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương trên 7 trang admin, i18n (`/vi/admin/apps` → `/vi/login`)
- **Tiền điều kiện:** một context không có cookie
- **Bước:**
  1. Mở `/admin`, `/admin/apps`, `/admin/categories`, `/admin/entitlements`, `/admin/users`, `/admin/login-history`, `/admin/contact`.
  2. Mở `/vi/admin/apps`.
- **Mong đợi:** mỗi trang đều dừng ở màn hình login (bản tiếng Việt với `/vi`); sidebar admin không bao giờ render.
- **Automated:** `tests/e2e/authz/guest-redirect.e2e.ts`

### TC-AUTHZ-014 — /admin shows the Admin Console with a card per area

- **Requirement:** REQ-AUTHZ-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (mọi card)
- **Tiền điều kiện:** session admin
- **Bước:**
  1. Mở `/admin`.
- **Mong đợi:** heading "Admin Console"; các card App Registry, Entitlements,
  Users, Contact Inbox, Login History, mỗi card có link "Open" tới
  `/admin/apps`, `/admin/entitlements`, `/admin/users`, `/admin/contact`,
  `/admin/login-history`.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`

### TC-AUTHZ-015 — Each landing card opens its area, and the sidebar leads back

- **Requirement:** REQ-AUTHZ-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (landing → khu vực → landing)
- **Tiền điều kiện:** session admin
- **Bước:**
  1. Từ `/admin`, bấm "Open" của từng card.
  2. Từ `/admin/users`, bấm "Dashboard" trên sidebar.
- **Mong đợi:** mỗi lần bấm dừng ở route của card; "Dashboard" quay về `/admin`.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`

### TC-AUTHZ-016 — The landing page links to the categories area

- **Requirement:** REQ-AUTHZ-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (Error Guessing — khu vực được thêm sau trang landing)
- **Tiền điều kiện:** session admin
- **Bước:**
  1. Mở `/admin` và tìm link tới `/admin/categories`.
- **Mong đợi:** có card Categories giống các khu vực khác. **Thực tế: thiếu** —
  `client/src/dataSources/AdminDashboard` chỉ liệt kê 5 trên 6 khu vực (sidebar
  có đủ 6). Đánh dấu `test.fail()` tới khi sửa.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`

### TC-AUTHZ-017 — The landing page renders in Vietnamese

- **Requirement:** REQ-AUTHZ-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (locale vi)
- **Tiền điều kiện:** session admin
- **Bước:**
  1. Mở `/vi/admin`.
- **Mong đợi:** heading "Bảng quản trị", card "Đăng ký ứng dụng", năm link "Mở", link đầu tiên trỏ tới `/vi/admin/apps`.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`

### TC-AUTHZ-018 — A non-admin is kept out of the admin console shell

- **Requirement:** REQ-AUTHZ-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — phân quyền chỉ được thực thi ở API)
- **Tiền điều kiện:** session của `user@test.com` đã seed
- **Bước:**
  1. Mở `/admin`.
- **Mong đợi:** user bị redirect hoặc thấy trang forbidden; "Admin Mode"
  không bao giờ render. **Thực tế:** toàn bộ admin shell, sidebar và các card
  landing đều render — không có guard vai trò phía client (dữ liệu vẫn được bảo
  vệ, xem TC-AUTHZ-001). Đánh dấu `test.fail()` tới khi sửa.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`

### TC-AUTHZ-019 — A user who rewrites the roles claim of their own token is refused

- **Requirement:** REQ-AUTHZ-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — leo thang đặc quyền bằng sửa payload JWT), phân vùng tương đương (token
  nguyên vẹn / token sửa claim)
- **Tiền điều kiện:** access token của `user@test.com` (đăng nhập qua API)
- **Bước:**
  1. `GET /admin/users` với token nguyên vẹn.
  2. Đổi claim `roles` trong payload thành `admin`, giữ nguyên header và chữ ký; gọi lại.
- **Mong đợi:** 1 → 403 `AUTH_ADMIN_ONLY` (hàng đối chứng); 2 → 403 `JWT_INVALID` — chữ ký không còn khớp, không bao
  giờ 200.
- **Automated:** `tests/api/authz/tokens.api.ts`

### TC-AUTHZ-020 — An admin's ID token or refresh token is not accepted as an access token

- **Requirement:** REQ-AUTHZ-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (Error Guessing — nhầm loại token), phân vùng tương đương (access / ID / refresh)
- **Tiền điều kiện:** bộ token của `admin@test.com` từ `POST /auth/login` (access + ID trong body, refresh trong cookie)
- **Bước:**
  1. `GET /admin/users` với từng token làm Bearer.
- **Mong đợi:** access token → 200 (đối chứng); ID token (cùng khoá ký, không có `authId`) → 401
  `AUTH_INVALID_TOKEN`; refresh token (HS256) → 403 `JWT_INVALID`.
- **Automated:** `tests/api/authz/tokens.api.ts`

### TC-AUTHZ-021 — The Admin Console entry appears in the user menu only for admins

- **Requirement:** REQ-AUTHZ-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user, admin
- **Kỹ thuật:** bảng quyết định (vai trò user / admin × mục menu), chuyển trạng thái (menu → `/admin`)
- **Tiền điều kiện:** session của `user@test.com` và `admin@test.com` đã seed
- **Bước:**
  1. User: mở trang chủ, mở user menu.
  2. Admin: mở trang chủ, mở user menu, bấm "Admin Console".
- **Mong đợi:** menu của user hiện email của họ nhưng không có "Admin Console"; menu của admin có, và bấm vào dừng ở
  `/admin` với heading "Admin Console".
- **Automated:** `tests/e2e/authz/admin-entry.e2e.ts`

### TC-AUTHZ-022 — Back to User Dashboard leaves the admin console

- **Requirement:** REQ-AUTHZ-06
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chế độ admin → dashboard người dùng)
- **Tiền điều kiện:** session admin
- **Bước:**
  1. Mở `/admin`; bấm "Back to User Dashboard" trên sidebar.
- **Mong đợi:** trước khi bấm, header có huy hiệu "Admin Mode"; sau khi bấm, trình duyệt ở trang chủ `/` và huy hiệu
  biến mất.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`
