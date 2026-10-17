# LOGINHISTORY — test case

Lịch sử đăng nhập của chính user tại `/login-history` và `GET /login-history`: một dòng hiện gì, lần đăng nhập đi vào đâu (Ducker ID hay ứng dụng vệ tinh), bộ lọc và phân trang, cách ly giữa các user, che IP, sắp xếp và lọc text của API, và validation (REQ-LOGINHISTORY-01…07).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/login-history.md

### TC-LOGINHISTORY-001 — Loopback IP and the "Local" location label

- **Requirement:** REQ-LOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (country = LOCAL, IP loopback)
- **Tiền điều kiện:** danh sách được stub với một dòng LOCAL
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** `127.0.0.1` và "Local"; không bao giờ có `::1`, `::ffff:` hay "LOCAL" thô.
- **Automated:** `tests/e2e/login-history/my-login-history.e2e.ts`

### TC-LOGINHISTORY-002 — The "Local" label in Vietnamese

- **Requirement:** REQ-LOGINHISTORY-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** cùng stub như trên
- **Bước:**
  1. Mở `/vi/login-history`.
- **Mong đợi:** "Nội bộ (Local)"; không có "LOCAL" thô.
- **Automated:** `tests/e2e/login-history/my-login-history.e2e.ts`

### TC-LOGINHISTORY-003 — The summary stat cards moved to Home

- **Requirement:** REQ-LOGINHISTORY-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (error guessing) (hồi quy)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** bảng hiện ra và không có nhóm "Total Logins:" nào.
- **Automated:** `tests/e2e/login-history/my-login-history.e2e.ts`

### TC-LOGINHISTORY-004 — Rows show Ducker ID or the app; silent SSO carries "Auto"

- **Requirement:** REQ-LOGINHISTORY-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (source idp / oauth × interactive true / false)
- **Tiền điều kiện:** danh sách được stub với một dòng IdP và một dòng SSO im lặng
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** dòng IdP ghi "Ducker ID" và không có badge; dòng SSO ghi tên ứng
  dụng, phương thức "SSO" và badge "Auto".
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGINHISTORY-005 — The default list hides nothing

- **Requirement:** REQ-LOGINHISTORY-02, REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (không lọc)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** các dòng SSO im lặng được liệt kê và request không có tham số `interactive`.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGINHISTORY-006 — Method = SSO includes silent sign-ins

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (method = sso)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở `/login-history?method=sso`.
- **Mong đợi:** request có `method=sso` và không có `interactive`.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGINHISTORY-007 — App filter "Ducker ID" maps to `source=idp` and survives reload

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (trạng thái URL qua lần tải lại)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở `/login-history?app=idp`; tải lại.
- **Mong đợi:** request có `source=idp` cả trước và sau khi tải lại.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGINHISTORY-008 — A filter with no match shows the empty state

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (0 dòng)
- **Tiền điều kiện:** danh sách được stub rỗng
- **Bước:**
  1. Mở `/login-history?app=idp`.
- **Mong đợi:** "No login history found".
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGINHISTORY-009 — App column and badge in Vietnamese

- **Requirement:** REQ-LOGINHISTORY-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** một dòng SSO im lặng được stub
- **Bước:**
  1. Mở `/vi/login-history`.
- **Mong đợi:** cột "Ứng dụng" và badge "Tự động".
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGINHISTORY-010 — A real silent SSO is recorded and listed

- **Requirement:** REQ-LOGINHISTORY-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (session → authorize → có trong danh sách)
- **Tiền điều kiện:** một OAuth client mà user thấy được, do spec đăng ký
- **Bước:**
  1. Authorize trên session của user seed; mở `/login-history?method=sso`.
- **Mong đợi:** 302 kèm code; một dòng cho ứng dụng đó với "Auto" và "Success".
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGINHISTORY-011 — An SSO denied for a missing role is recorded as failed

- **Requirement:** REQ-LOGINHISTORY-02, REQ-LOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (role user × ứng dụng chỉ-admin)
- **Tiền điều kiện:** một OAuth client chỉ dành cho admin, do spec đăng ký
- **Bước:**
  1. Authorize vào nó; mở `/login-history?method=sso`.
- **Mong đợi:** 302 kèm `error=access_denied`; một dòng "Failed" cho ứng dụng đó.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGINHISTORY-012 — The status filter from the Filters panel

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** EP (status = failed), chuyển trạng thái (chưa lọc → đã lọc)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở Filters; chọn Status → "Failed".
- **Mong đợi:** `status=failed` có trên URL và trong request, kèm `page=1`.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-013 — Filters combine; foreign values are dropped

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (status × method × device × app), EP (giá trị không hợp lệ)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở `?status=failed&method=otp&deviceType=MOBILE&app=idp`;
  2. mở `?status=maybe&method=telepathy&deviceType=FRIDGE`.
- **Mong đợi:** một request mang cả bốn (app thành `source=idp`) và badge
  "4"; các giá trị không hợp lệ hoàn toàn không được gửi.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-014 — A date-range deep link

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (cả hai mốc)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở `?fromDate=2026-10-01&toDate=2026-10-05`.
- **Mong đợi:** cả hai ngày được chuyển đi nguyên vẹn.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-015 — The pager

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (trang 1 → cuối), chuyển trạng thái
- **Tiền điều kiện:** danh sách được stub với hai trang
- **Bước:**
  1. Bấm "Go to next page".
- **Mong đợi:** Previous bị disable ở trang 1; `page=2` có trên URL và trong request; Next
  bị disable ở trang cuối.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-016 — A row shows method, result, device, browser, IP and location

- **Requirement:** REQ-LOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (OTP, mobile, quốc gia/thành phố thật)
- **Tiền điều kiện:** một dòng được stub
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** "OTP", "Success", "MOBILE · Safari 17", IP và "Hanoi, VN".
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-017 — A failed row shows its reason, the OS and the anomaly flag

- **Requirement:** REQ-LOGINHISTORY-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (thất bại, bất thường), kiểm tra theo đặc tả
- **Tiền điều kiện:** một dòng thất bại và bất thường được stub (reason `invalid_password`, OS Ubuntu 24.04)
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** dòng hiện "Failed", lý do và hệ điều hành.
- **Ghi chú:** spec đánh dấu `test.fail()`: **bug của app** — `buildLoginHistoryColumns` không có
  cột lý do, OS hay cờ bất thường dù README / REQ-LOGINHISTORY-01 hứa có.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-018 — A guest is sent to the login screen

- **Requirement:** REQ-LOGINHISTORY-04, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** EP (không có session)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/login-history`.
- **Mong đợi:** chuyển tới `/login`; không có bảng.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-020 — List contract

- **Requirement:** REQ-LOGINHISTORY-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** kiểm tra theo đặc tả
- **Tiền điều kiện:** user seed đã đăng nhập ít nhất một lần (setup)
- **Bước:**
  1. `GET /login-history?limit=5`.
- **Mong đợi:** meta page 1 / limit 5; mọi dòng có method, status,
  failReason, ip, country, city, deviceType, os, browser, clientType,
  createdAt, source, app, interactive; status và source là giá trị đã biết; không có
  IPv6 loopback thô; mới nhất đứng đầu.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-021 — A wrong password is a failed row with a reason

- **Requirement:** REQ-LOGINHISTORY-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user dùng một lần
- **Kỹ thuật:** EP (lần thử thất bại / thành công)
- **Tiền điều kiện:** tài khoản mới, một lần sai mật khẩu
- **Bước:**
  1. Lấy lịch sử của tài khoản.
- **Mong đợi:** đúng một dòng `password` thất bại có `failReason`;
  các dòng thành công có `failReason: null`.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-022 — Rows carry the anomaly flag

- **Requirement:** REQ-LOGINHISTORY-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** kiểm tra theo đặc tả
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /login-history`.
- **Mong đợi:** mọi dòng có `isAnomaly` kiểu boolean.
- **Ghi chú:** spec đánh dấu `test.fail()`: **bug của app** — `MyHistoryItemDto` bỏ mất `isAnomaly`
  (chỉ DTO của admin có).
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-023 — Filters on the server

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** EP (status / method / source), bảng quyết định (method × status), giá trị biên (BVA) (mốc ngày)
- **Tiền điều kiện:** tài khoản mới có một lần đăng nhập thất bại và ≥ 1 lần thành công
- **Bước:**
  1. Lọc theo từng status, `method=password&status=failed`, `method=otp`,
     `source=oauth|idp`, hôm qua…ngày mai, từ ngày mai.
- **Mong đợi:** mỗi tập con chỉ chứa dòng khớp và failed + success =
  tất cả; bộ lọc kết hợp trả đúng một dòng; otp và oauth rỗng; idp là
  tất cả; khoảng ngày chứa tất cả; từ ngày mai thì rỗng.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-024 — Validation and page boundaries

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (enum, id, ngày, sort không hợp lệ), giá trị biên (BVA) (page 0, limit 0 / 1 / 100 / 101, cuối + 1)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gửi từng tham số không hợp lệ; rồi `limit=1` ở `totalPages + 1`.
- **Mong đợi:** 400 cho mọi giá trị không hợp lệ và cho `toDate < fromDate`;
  limit 1 / 100 → 200; cuối + 1 trả `[]` với cùng total.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-025 — A user never sees another user's attempts

- **Requirement:** REQ-LOGINHISTORY-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** hai user dùng một lần, user
- **Kỹ thuật:** đoán lỗi (rò dữ liệu chéo tài khoản, `userId` bị sửa tay)
- **Tiền điều kiện:** Bob có một lần thử thất bại; Alice không có
- **Bước:**
  1. Lấy lịch sử của Alice; so với id của user seed; lặp lại với
     `userId=<other>`.
- **Mong đợi:** Alice chỉ thấy các dòng thành công của chính mình, không có id nào của
  user seed; tham số `userId` bị bỏ qua (cùng total).
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-026 — Session required; the admin list needs admin

- **Requirement:** REQ-LOGINHISTORY-04, REQ-AUTHZ-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest, user
- **Kỹ thuật:** bảng quyết định (không session / user × endpoint của mình / endpoint admin)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Guest GET `/login-history` và `/login-history/stats`; user GET `/admin/login-history`.
- **Mong đợi:** 401, 401, 403.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-027 — SSO rows name the app and filter by it

- **Requirement:** REQ-LOGINHISTORY-02, REQ-LOGINHISTORY-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần có session IdP
- **Kỹ thuật:** chuyển trạng thái (authorize → dòng), EP (webAppId / source / interactive)
- **Tiền điều kiện:** một OAuth client public do spec đăng ký
- **Bước:**
  1. Authorize cho tới khi code được cấp; lấy danh sách với `method=sso`, `webAppId=<app>`,
     `source=idp`, `interactive=false`.
- **Mong đợi:** một dòng `{ method: sso, status: success, source: oauth,
interactive: false, app: { id, name } }`; `webAppId` và `interactive=false`
  trả đúng dòng đó; `source=idp` loại nó ra.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-028 — An unknown location and device fall back to labels

- **Requirement:** REQ-LOGINHISTORY-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (country / city = UNKNOWN, deviceType = UNKNOWN)
- **Tiền điều kiện:** một dòng được stub với vị trí và thiết bị `UNKNOWN`, IP đã che `198.51.*.*`
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** dòng hiện "Unknown" và chỉ tên trình duyệt ("Firefox 130"); không có "UNKNOWN" thô, không có
  "UNKNOWN ·".
- **Automated:** `tests/e2e/login-history/my-login-history.e2e.ts`

### TC-LOGINHISTORY-029 — Public IPs are masked in the user's own history

- **Requirement:** REQ-LOGINHISTORY-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** bảo mật (lộ dữ liệu), EP (IP công khai / private)
- **Tiền điều kiện:** tài khoản mới đăng nhập một lần với `X-Forwarded-For: 203.0.113.7`
- **Bước:**
  1. Lấy lịch sử của tài khoản.
- **Mong đợi:** không dòng nào mang `203.0.113.7`; mọi IP hoặc là private / loopback, hoặc đã che (`a.b.*.*`).
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-030 — The App filter lists the catalogue apps and sends webAppId

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (lựa chọn "Ducker ID" / một app của catalogue)
- **Tiền điều kiện:** danh sách được stub; catalogue của user có ít nhất một app (`GET /apps`)
- **Bước:**
  1. Mở Filters → App; chọn app đầu tiên của catalogue.
- **Mong đợi:** danh sách lựa chọn có "Ducker ID" và các app của catalogue; `app=<id>` có trên URL; request có
  `webAppId=<id>` và không có `source`.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-031 — A date-range preset from the Filters panel sends a date window

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (chưa lọc → preset), giá trị biên (BVA) (độ dài cửa sổ)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở Filters → Date range → "Last 7 days".
- **Mong đợi:** `dateRange=last7` có trên URL; request có `fromDate` và `toDate` cách nhau trong khoảng 5…8 ngày.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-032 — Clear filters from the empty state restores the full list

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (đã lọc, rỗng → bỏ lọc)
- **Tiền điều kiện:** danh sách được stub rỗng, rồi có dòng
- **Bước:**
  1. Mở `/login-history?status=failed`; bấm "Clear filters" ở trạng thái rỗng.
- **Mong đợi:** "No login history found" kèm nút "Clear filters"; sau khi bấm, URL và request không còn `status`,
  bảng hiện lại.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-033 — A single page of results shows no pager

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (`totalPages` = 1)
- **Tiền điều kiện:** danh sách được stub với một trang
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** bảng có dòng, không có pager; request có `limit=20`.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGINHISTORY-034 — The list sorts by the requested field and order

- **Requirement:** REQ-LOGINHISTORY-06
- **Layer:** api · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** EP (sortBy × sortOrder)
- **Tiền điều kiện:** user seed có lịch sử (setup)
- **Bước:**
  1. `sortBy=createdAt&sortOrder=asc`, `sortBy=status&sortOrder=desc`, `sortBy=method&sortOrder=asc` (limit 100).
- **Mong đợi:** mỗi danh sách đúng thứ tự yêu cầu.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-035 — Text, device, client and interactive filters narrow the caller's attempts

- **Requirement:** REQ-LOGINHISTORY-06, REQ-LOGINHISTORY-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** EP (khớp đủ / một phần / HOA / thường / khoảng trắng, `.*` theo nghĩa đen), đoán lỗi (bộ lọc chỉ của
  admin)
- **Tiền điều kiện:** tài khoản mới có một lần sai mật khẩu và ≥ 1 lần đúng
- **Bước:**
  1. Lọc `country` / `city` / `os` / `browser` theo giá trị của một dòng, nửa đầu viết thường / HOA, có khoảng trắng,
     và `.*`;
  2. lọc `deviceType` / `clientType` theo giá trị của mình và giá trị khác, `interactive=true|false`, `ip=…`.
- **Mong đợi:** mỗi bộ lọc text trả đúng số dòng chứa chuỗi đó (không phân biệt hoa thường), `.*` trả 0; giá trị khác
  và `interactive=false` trả 0; `ip` bị bỏ qua (trả tất cả).
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-036 — Each invalid filter is named with a readable message

- **Requirement:** REQ-LOGINHISTORY-07
- **Layer:** api · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (key i18n thiếu), EP (mỗi trường không hợp lệ, sortBy chỉ của admin)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gửi từng tham số không hợp lệ với `Accept-Language: en`.
- **Mong đợi:** 400 `VALIDATION_ERROR`; `errors` có mục cho trường đó với message đã dịch (không phải `<field>.invalid`).
- **Ghi chú:** các dòng `method`, `deviceType`, `clientType`, `fromDate`, `toDate`, khoảng ngày đánh `test.fail()`:
  BUG-LOGINHISTORY-02.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-037 — Text filters stop at 200 characters and query operators are refused

- **Requirement:** REQ-LOGINHISTORY-07, REQ-LOGINHISTORY-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (200 / 201 ký tự), bảo mật (NoSQL operator injection)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mỗi bộ lọc text với 200 rồi 201 ký tự;
  2. `status[$ne]=success`, `country[$regex]=.*`, `webAppId[$gt]=`, `method[$in][]=…`.
- **Mong đợi:** 200 ký tự → 200; 201 → 400; mọi toán tử → 400 `VALIDATION_ERROR`.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGINHISTORY-038 — A date-only window covers the whole day

- **Requirement:** REQ-LOGINHISTORY-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** giá trị biên (BVA) (cùng ngày / ngày trước / ngày sau)
- **Tiền điều kiện:** tài khoản mới có vài lần thử trong hôm nay
- **Bước:**
  1. `fromDate = toDate = ngày của các dòng`; rồi ngày trước; rồi `fromDate` = ngày sau.
- **Mong đợi:** cùng ngày trả mọi dòng của ngày đó; ngày trước và từ ngày sau trả 0.
- **Automated:** `tests/api/login-history/my-history.api.ts`
