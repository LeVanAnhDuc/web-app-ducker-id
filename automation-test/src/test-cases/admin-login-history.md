# ADMINLOGINHISTORY — test case

Màn admin xem mọi lần đăng nhập tại `/admin/login-history`, bộ lọc, và trang chi tiết một lần đăng nhập kèm nguồn gốc, cùng hợp đồng API phía sau (REQ-ADMINLOGINHISTORY-01…05).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/admin-login-history.md

## Danh sách — REQ-ADMINLOGINHISTORY-01

### TC-ADMINLOGINHISTORY-001 — The list shows attempts from many accounts

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** lịch sử đăng nhập có lần thử của nhiều hơn một tài khoản
- **Bước:**
  1. Mở `/admin/login-history`.
- **Mong đợi:** heading "All Login History"; các cột Username Attempted, App,
  Method, Status, IP & Location, Anomaly, Date; link của các dòng mang ít nhất hai
  username khác nhau.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-002 — Status filter

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (success, failed)
- **Tiền điều kiện:** có cả hai loại lần thử
- **Bước:**
  1. Mở `?status=failed`, rồi `?status=success`.
- **Mong đợi:** request mang cùng `status`; mọi dòng hiện nhãn trạng thái đó và
  không dòng nào hiện trạng thái còn lại.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-003 — Method filter

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (password)
- **Tiền điều kiện:** có lần đăng nhập bằng mật khẩu
- **Bước:**
  1. Mở `?method=password`.
- **Mong đợi:** request mang `method=password`; không dòng nào hiện OTP,
  Magic Link, SSO hay Forgot Password.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-004 — Choosing a filter in the panel writes the URL

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (trang 2 → lọc → trang 1)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?page=2`, Filters → Status → "Failed".
- **Mong đợi:** URL mang `status=failed` và `page=1`; request danh sách kế tiếp
  mang đúng như vậy.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-005 — The App column shows the satellite app and "Auto"

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (dòng SSO im lặng)
- **Tiền điều kiện:** danh sách được stub với một dòng SSO im lặng cho "Match CV"
- **Bước:**
  1. Mở `/admin/login-history`.
- **Mong đợi:** dòng hiện "Match CV" kèm badge "Auto"; request mặc định không gửi
  param `interactive`.
- **Automated:** `tests/e2e/admin-login-history/app-source.e2e.ts`

### TC-ADMINLOGINHISTORY-006 — App filter "Ducker ID" maps to source=idp

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (identity provider)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?app=idp`.
- **Mong đợi:** request mang `source=idp` và không có `webAppId`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-007 — Filters combine; an invalid one is dropped alone

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (status × method × app × date; hợp lệ/không hợp lệ)
- **Tiền điều kiện:** danh sách được stub rỗng
- **Bước:**
  1. Mở `?status=failed&method=password&app=idp&fromDate=2026-01-01&toDate=2026-01-31`.
  2. Mở `?status=bogus&method=otp`.
  3. Mở `?status=success&method=telepathy&app=idp`.
- **Mong đợi:** (1) cả năm param tới được API; (2) không có `status`, có `method=otp`;
  (3) `status=success`, không có `method`, có `source=idp`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-008 — A date-range preset sends a date window

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (preset 7 ngày gần nhất)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Filters → "Date range" → "Last 7 days".
- **Mong đợi:** URL mang `dateRange=last7`; request mang `fromDate`
  và `toDate` cách nhau khoảng 7 ngày.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-009 — Device filter reaches the API

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (MOBILE)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?deviceType=MOBILE` (bộ lọc Device có trong panel).
- **Mong đợi:** request danh sách mang `deviceType=MOBILE`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts` —
  `test.fail()`: **BUG** — `AdminLoginHistoryTable` có bộ lọc Device
  nhưng không bao giờ đưa `deviceType` vào request (bảng phía user thì có).

### TC-ADMINLOGINHISTORY-013 — No match shows the empty state

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (kết quả rỗng)
- **Tiền điều kiện:** danh sách được stub rỗng
- **Bước:**
  1. Mở `?status=failed`, bấm "Clear filters".
- **Mong đợi:** "No login history found"; sau khi xoá lọc, URL không còn
  `status`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-028 — Vietnamese list

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/admin/login-history`.
- **Mong đợi:** heading "Toàn bộ lịch sử đăng nhập", nút "Bộ lọc", cột
  "Trạng thái", link dòng "Xem chi tiết cho …"; không lộ key `loginHistory.`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-030 — List API contract

- **Requirement:** REQ-ADMINLOGINHISTORY-01, REQ-ADMINLOGINHISTORY-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api/v1/admin/login-history?limit=100`.
- **Mong đợi:** envelope 200; `meta` `{ page: 1, limit: 100, total,
totalPages }`; item có `_id`, `status`, `source`, `interactive`,
  `usernameAttempted`, `app`; mới nhất trước; nhiều hơn một username.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-031 — Filters return exactly the matching attempts

- **Requirement:** REQ-ADMINLOGINHISTORY-01, REQ-ADMINLOGINHISTORY-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (userId × status / method / source / ip / date)
- **Tiền điều kiện:** một tài khoản dùng một lần có một lần đăng nhập mật khẩu thành công
  và một lần thất bại
- **Bước:**
  1. Lọc theo auth id của nó riêng lẻ và kết hợp với từng bộ lọc khác; với một
     khoảng ngày trong năm 2020 và một khoảng quanh hôm nay.
- **Mong đợi:** chỉ userId → 2 dòng của nó; + success → 1; + failed → 1 (có
  `failReason`); + password → 2; + otp → 0; + idp → 2; + oauth → 0; + ip của nó →
  2; khoảng 2020 → 0; khoảng hôm nay → các dòng của nó.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-032 — List query validation

- **Requirement:** REQ-ADMINLOGINHISTORY-01, REQ-ADMINLOGINHISTORY-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (page 0/1, limit 0/1/100/101, ip 201 ký tự, fromDate =
  toDate, fromDate > toDate), phân vùng tương đương (EP) (mỗi enum hợp lệ/không hợp lệ, id, boolean)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi danh sách với từng giá trị.
- **Mong đợi:** giá trị hợp lệ → 200; không hợp lệ → 400 `VALIDATION_ERROR`.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-035 — Pagination boundaries

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (limit 1, page 2, quá trang cuối)
- **Tiền điều kiện:** có ít nhất hai lần thử
- **Bước:**
  1. Đọc trang 1 và 2 với `limit=1`, rồi một trang quá trang cuối.
- **Mong đợi:** mỗi trang một dòng khác nhau, `totalPages = total`; quá trang cuối
  → `items: []`.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-034 — Only admins reach the endpoints

- **Requirement:** REQ-ADMINLOGINHISTORY-01, REQ-ADMINLOGINHISTORY-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest, user
- **Kỹ thuật:** bảng quyết định (vai trò × endpoint)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi danh sách và một chi tiết khi không có token và khi có token user.
- **Mong đợi:** 401 `AUTH_MISSING_TOKEN`; 403 `AUTH_ADMIN_ONLY` (không có
  guard vai trò phía client cho `/admin/*`; đây chính là cổng chặn — dòng 3 của
  spec chi tiết cũ).
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-044 — App filter with a catalog app sends its webAppId

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (lớp còn lại của bộ lọc App: một app trong catalog)
- **Tiền điều kiện:** catalog có ít nhất một app (seed); danh sách được stub rỗng
- **Bước:**
  1. Lấy id của một app qua `GET /apps` (admin), mở `?app=<id>`.
- **Mong đợi:** sau khi danh sách app của bộ lọc tải xong, request danh sách mang `webAppId=<id>` và không có
  `source`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-045 — List rows render labels, not stored values

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (method / status / isAnomaly / country sentinel / app null → nhãn)
- **Tiền điều kiện:** danh sách được stub với một dòng magic-link thất bại, bất thường, country `LOCAL`, app null
- **Bước:**
  1. Mở `/admin/login-history`.
- **Mong đợi:** dòng hiện "Magic Link", "Failed", "Yes", "Local", "Ducker ID"; không hiện `magic-link`, `failed`,
  `LOCAL`, `true`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-046 — The pager appears past one page and moves to the next

- **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (total 20 = 1 trang, total 45 = 3 trang), chuyển trạng thái (trang 1 → 2)
- **Tiền điều kiện:** danh sách được stub với `total` 20, rồi 45
- **Bước:**
  1. Mở danh sách với total 20.
  2. Mở danh sách với total 45, bấm "Go to next page".
- **Mong đợi:** (1) không có pager; (2) pager hiện, URL mang `page=2` và request kế tiếp mang `page=2`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMINLOGINHISTORY-036 — List and detail answer with their success message

- **Requirement:** REQ-ADMINLOGINHISTORY-01, REQ-ADMINLOGINHISTORY-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (response thành công, `Accept-Language: en`)
- **Tiền điều kiện:** có ít nhất một dòng
- **Bước:**
  1. `GET /admin/login-history?limit=1`, rồi `GET /admin/login-history/<id của dòng đó>`.
- **Mong đợi:** `message` lần lượt là "All login history retrieved successfully" và "Login history detail retrieved
  successfully" (`loginHistory:success.*`).
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

## Chi tiết — REQ-ADMINLOGINHISTORY-02

### TC-ADMINLOGINHISTORY-010 — Clicking a row opens its detail page

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (bản ghi có tồn tại)
- **Tiền điều kiện:** có ít nhất một dòng
- **Bước:**
  1. Mở danh sách, bấm link của dòng đầu tiên.
- **Mong đợi:** URL `/admin/login-history/<24-hex>`; heading "Login Attempt
  Detail"; trường "IP Address".
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-011 — A detail URL can be opened directly

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (deep link)
- **Tiền điều kiện:** có một URL chi tiết
- **Bước:**
  1. Vào danh sách, rồi đi thẳng tới URL chi tiết.
- **Mong đợi:** heading chi tiết hiện ra.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-012 — Each row is a named link to its detail

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng truy cập (accessibility)
- **Tiền điều kiện:** có ít nhất một dòng
- **Bước:**
  1. Mở danh sách.
- **Mong đợi:** một link tên "View details for …" với
  `href` `/admin/login-history/<24-hex>`.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-014 — Detail shows source, app and sign-in type

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (SSO im lặng từ app vệ tinh)
- **Tiền điều kiện:** chi tiết được stub: source oauth, app "Match CV",
  interactive false
- **Bước:**
  1. Mở chi tiết.
- **Mong đợi:** "Satellite app (OIDC)", "Match CV", "Automatic SSO (existing
  session)".
- **Automated:** `tests/e2e/admin-login-history/app-source.e2e.ts`

### TC-ADMINLOGINHISTORY-015 — Detail values render as labels

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (enum / boolean / date → nhãn)
- **Tiền điều kiện:** chi tiết được stub với một lần thử mật khẩu thất bại, bất thường
- **Bước:**
  1. Mở chi tiết.
- **Mong đợi:** "Failed", "Password" — không bao giờ hiện `failed`, `password`, `true`,
  `false` hay timestamp ISO.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-016 — Empty fields are hidden

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (null → ẩn, có giá trị → hiện, [] → "None")
- **Tiền điều kiện:** chi tiết được stub với userId / timezoneOffset null và không có
  lý do bất thường
- **Bước:**
  1. Mở chi tiết.
- **Mong đợi:** hiện lý do thất bại; không có "User ID" và "Timezone"; lý do
  bất thường là "None"; badge "Failed".
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-017 — Local and unknown locations get labels

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (sentinel LOCAL, UNKNOWN), i18n (en, vi)
- **Tiền điều kiện:** chi tiết được stub với từng sentinel
- **Bước:**
  1. Mở chi tiết cho LOCAL (en, vi) và UNKNOWN (en).
- **Mong đợi:** "Local" + `127.0.0.1`, "Unknown", vi "Nội bộ (Local)"; giá trị thô
  `LOCAL` / `UNKNOWN` không bao giờ hiện.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-018 — A malformed id shows "not found"

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (id sai định dạng → 400)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/login-history/not-a-valid-id`.
- **Mong đợi:** "Login history record not found."
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-019 — An unknown id shows "not found"

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (id không tồn tại → 404)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/login-history/000000000000000000000000`.
- **Mong đợi:** "Login history record not found."
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-020 — A failed load shows the error state

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (5xx, mất kết nối mạng)
- **Tiền điều kiện:** chi tiết được stub trả 500 / bị abort
- **Bước:**
  1. Mở chi tiết với từng stub; với trường hợp abort, đóng toast bằng OK.
- **Mong đợi:** 500 → "Could not load this login record…"; abort → toast "Unable to
  connect to server…", rồi cùng trạng thái lỗi đó.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-021 — A skeleton shows while the detail loads

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (response chậm)
- **Tiền điều kiện:** chi tiết bị trễ 800 ms
- **Bước:**
  1. Mở một chi tiết.
- **Mong đợi:** skeleton nhấp nháy, rồi heading, rồi không còn skeleton.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-022 — Vietnamese detail, not-found and error

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Từ `/vi/admin/login-history` mở một dòng; mở một id sai định dạng; mở một
     chi tiết được stub trả 500.
- **Mong đợi:** "Địa chỉ IP"; "Không tìm thấy bản ghi lịch sử đăng nhập";
  "Không thể tải bản ghi đăng nhập này"; không lộ key `loginHistory.admin.detail`.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-023 — A row opens from the keyboard

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng truy cập (accessibility), chuyển trạng thái (focus → Enter → chi tiết)
- **Tiền điều kiện:** có ít nhất một dòng
- **Bước:**
  1. Focus link của dòng đầu tiên, nhấn Enter.
- **Mong đợi:** trang chi tiết mở ra.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-024 — Back returns to the filtered list

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (danh sách?query → chi tiết → back)
- **Tiền điều kiện:** có một lần thử thất bại
- **Bước:**
  1. Mở `?status=failed&page=1`, mở một dòng, nhấn Back.
- **Mong đợi:** URL vẫn mang `status=failed` và `page=1`.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-025 — The loaded detail is announced

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** khả năng truy cập (accessibility)
- **Tiền điều kiện:** chi tiết được stub
- **Bước:**
  1. Mở một chi tiết.
- **Mong đợi:** `#announcer` chứa "Login attempt detail loaded".
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-026 — A guest is sent to sign in

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (chưa xác thực → /login)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở một URL chi tiết khi không có session.
- **Mong đợi:** trình duyệt về `/login`.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMINLOGINHISTORY-033 — Detail API contract and id errors

- **Requirement:** REQ-ADMINLOGINHISTORY-02, REQ-ADMINLOGINHISTORY-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP), đoán lỗi (id sai định dạng, id không tồn tại)
- **Tiền điều kiện:** có ít nhất một dòng
- **Bước:**
  1. Đọc chi tiết của dòng mới nhất; đọc `not-an-id` và
     `000000000000000000000000`.
- **Mong đợi:** 200 với cùng `_id` / `usernameAttempted` kèm
  `userAgent`, `source`, `app`, `interactive`; 400 `VALIDATION_ERROR`; 404.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-047 — The breadcrumb leads back to the list

- **Requirement:** REQ-ADMINLOGINHISTORY-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chi tiết → breadcrumb → danh sách)
- **Tiền điều kiện:** chi tiết được stub
- **Bước:**
  1. Mở một chi tiết, bấm "Login History" trong breadcrumb.
- **Mong đợi:** URL `/admin/login-history`; heading "All Login History".
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

## Sắp xếp — REQ-ADMINLOGINHISTORY-03

### TC-ADMINLOGINHISTORY-038 — The list sorts by the requested field and order

- **Requirement:** REQ-ADMINLOGINHISTORY-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (sortBy text / date × sortOrder asc / desc)
- **Tiền điều kiện:** có nhiều hơn một dòng
- **Bước:**
  1. `?sortBy=usernameAttempted&sortOrder=asc&limit=100`.
  2. `?sortBy=createdAt&sortOrder=asc&limit=100`.
  3. `?sortBy=ip&sortOrder=desc&limit=100`.
- **Mong đợi:** (1) username tăng dần; (2) cũ nhất trước; (3) ip giảm dần.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

## Validation và lỗi — REQ-ADMINLOGINHISTORY-04

### TC-ADMINLOGINHISTORY-037 — Detail id errors carry their code and message

- **Requirement:** REQ-ADMINLOGINHISTORY-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (id sai định dạng, id không tồn tại), `Accept-Language: en`
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /admin/login-history/not-an-id`.
  2. `GET /admin/login-history/000000000000000000000000`.
- **Mong đợi:** (1) 400 `VALIDATION_ERROR`, message "Validation failed", `errors` có `{ field: "id", message:
"Invalid login history id" }`; (2) 404 `LOGIN_HISTORY_NOT_FOUND`, message "Login history record not found".
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-041 — Text filters accept 200 characters and refuse 201

- **Requirement:** REQ-ADMINLOGINHISTORY-04, REQ-ADMINLOGINHISTORY-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (200 / 201 ký tự cho `ip`, `country`, `city`, `os`, `browser`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi danh sách với từng bộ lọc text dài 200 ký tự, rồi 201 ký tự (`ip` 201 đã ở TC-ADMINLOGINHISTORY-032).
- **Mong đợi:** 200 ký tự → 200; 201 ký tự → 400 `VALIDATION_ERROR`.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-042 — A query operator in a filter is refused

- **Requirement:** REQ-ADMINLOGINHISTORY-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảo mật (NoSQL operator injection qua query string)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi danh sách với `status[$ne]=success`, `userId[$gt]=`, `ip[$regex]=.*`,
     `usernameAttempted[$exists]=true&country[$ne]=x`.
- **Mong đợi:** mỗi lần 400 `VALIDATION_ERROR` — không bao giờ 200 kèm dữ liệu, không bao giờ 5xx.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-043 — Each invalid filter is named with a readable message

- **Requirement:** REQ-ADMINLOGINHISTORY-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (message thiếu bản dịch), phân vùng tương đương (EP) (mỗi tham số một giá trị sai)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Với `Accept-Language: en`, gọi danh sách với một giá trị sai cho từng tham số: page, limit, status, method,
     deviceType, clientType, source, userId, webAppId, interactive, fromDate, toDate, fromDate > toDate, sortBy,
     sortOrder, country (201 ký tự).
- **Mong đợi:** 400 `VALIDATION_ERROR`; `errors` có một mục cho đúng trường đó (khoảng ngày ngược: trường rỗng) với
  message đọc được — bằng chuỗi trong `validation.json` khi có, không bao giờ là key thô kiểu `method.invalid`.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts` —
  `test.fail()` cho method, deviceType, clientType, userId, fromDate, toDate và khoảng ngày ngược:
  **BUG** — `validation.json` của server không có các key đó.

## Ngữ nghĩa bộ lọc — REQ-ADMINLOGINHISTORY-05

### TC-ADMINLOGINHISTORY-039 — Text filters match partially, in any case and literally

- **Requirement:** REQ-ADMINLOGINHISTORY-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (nguyên giá trị / một phần / chữ thường / chữ HOA / có khoảng trắng hai
  đầu), đoán lỗi (ký tự regex `.*`)
- **Tiền điều kiện:** một tài khoản dùng một lần có hai lần đăng nhập mật khẩu (một thành công, một thất bại)
- **Bước:**
  1. Với `userId` của nó, lọc theo `country`, `city`, `os`, `browser`, `ip` bằng từng biến thể giá trị của chính
     dòng đó, rồi bằng `.*`.
- **Mong đợi:** mọi biến thể → 2 dòng; `.*` → 0 dòng.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-040 — A date-only window covers the whole day

- **Requirement:** REQ-ADMINLOGINHISTORY-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (fromDate = toDate = ngày của lần thử; ngày trước; ngày sau)
- **Tiền điều kiện:** một tài khoản dùng một lần có hai lần đăng nhập
- **Bước:**
  1. Lọc theo `userId` với `fromDate = toDate = <ngày UTC của lần thử>`.
  2. Với `fromDate = toDate = <ngày trước>`.
  3. Với `fromDate = <ngày sau>`.
- **Mong đợi:** (1) 2 dòng; (2) 0; (3) 0.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMINLOGINHISTORY-048 — Device, client, interactive and app filters narrow to the matching attempts

- **Requirement:** REQ-ADMINLOGINHISTORY-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (giá trị của chính dòng / giá trị khác cho mỗi enum, boolean, id)
- **Tiền điều kiện:** một tài khoản dùng một lần có hai lần đăng nhập
- **Bước:**
  1. Lọc theo `userId` kèm `deviceType`, `clientType` của chính dòng và một giá trị khác; `interactive` true / false;
     một `webAppId` không có lần thử nào.
- **Mong đợi:** giá trị của chính dòng → 2; giá trị khác → 0; `interactive=true` → 2, `false` → 0; `webAppId` → 0.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`
