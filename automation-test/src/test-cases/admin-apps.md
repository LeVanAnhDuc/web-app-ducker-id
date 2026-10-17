# ADMINAPPS — test case

Danh sách ứng dụng đã đăng ký ở `/admin/apps`: liệt kê, tạo, credentials, sửa, bật/tắt trạng thái, từ chối input sai và xác nhận thao tác (REQ-ADMINAPPS-01…07).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/admin-apps.md

## Danh sách, tìm kiếm, bộ lọc, điều khiển cột (REQ-ADMINAPPS-01)

### TC-ADMINAPPS-001 — Sorting by App orders ascending then descending

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chưa sắp xếp → tăng dần → giảm dần)
- **Tiền điều kiện:** ≥ 2 ứng dụng (seed có 6)
- **Bước:**
  1. Mở `/admin/apps`, bấm "Sort by App" hai lần.
- **Mong đợi:** `aria-sort` của header App chuyển `ascending` rồi `descending` và tên hiển thị sắp theo đúng thứ tự (không phân biệt hoa/thường).
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-002 — The sort toggle cycles and only one column is sorted at a time

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (tăng → giảm → tăng; đổi cột là chuyển trạng thái không hợp lệ với cột cũ)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Bấm "Sort by App" ba lần, rồi "Sort by Last Updated".
- **Mong đợi:** App đi tăng → giảm → tăng; sau khi đổi cột, App là `none`, Last Updated là `ascending`, và đúng một header có `aria-sort` khác `none`.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-003 — The sort lives in the URL and survives a reload

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đã sắp xếp → tải lại → vẫn sắp xếp)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Sắp xếp theo App, tải lại.
- **Mong đợi:** URL có `sortBy=app&sortOrder=asc`; sau khi tải lại header vẫn là `ascending`.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-004 — A deep-linked sort applies on first load

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (trạng thái đặt sẵn trên URL)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/apps?sortBy=app&sortOrder=desc`.
- **Mong đợi:** bảng tải lên đã sắp giảm dần với `aria-sort="descending"`, không cần bấm.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-005 — Sorting works inside an active status filter

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (bộ lọc × sắp xếp)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/apps?status=active&sortBy=app&sortOrder=asc`.
- **Mong đợi:** các dòng đã lọc được sắp tăng dần; bộ lọc không bị reset.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-006 — Invalid sort parameters are ignored without a crash

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** EP (`sortBy` của cột không có accessor / `sortBy` rác / `sortOrder` rác)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?sortBy=status`, `?sortBy=___bogus&sortOrder=asc`, `?sortBy=app&sortOrder=sideways`.
- **Mong đợi:** bảng hiện ra mọi lần; header Status không có `aria-sort`; thứ tự không hợp lệ để App ở `none`.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-007 — The sort header is keyboard operable

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (a11y)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Focus vào "Sort by App", nhấn Enter.
- **Mong đợi:** nút nhận focus và cột chuyển thành `ascending`.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-008 — Breakpoint columns hide below their threshold

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (viewport 639 / 640 cho Category, 767 / 768 cho Redirect URIs)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Đổi chiều rộng thành 639, 640, 767, 768 px.
- **Mong đợi:** Category ẩn ở 639 và hiện ở 640; Redirect URIs ẩn ở 767 và hiện ở 768.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-009 — Sorting works in Vietnamese with localized labels

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** EP (locale vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/admin/apps`, bấm nút "Sắp xếp theo …" đầu tiên.
- **Mong đợi:** URL có thêm `sortBy=`; đúng một header được sắp xếp.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMINAPPS-010 — The registry lists every app with readable values

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** EP (hoạt động / không hoạt động, một role / hai role), đoán lỗi (enum thô, ObjectId, ngày ISO)
- **Tiền điều kiện:** các ứng dụng seed
- **Bước:**
  1. Mở `/admin/apps`.
- **Mong đợi:** cả 6 ứng dụng seed đều được liệt kê; Team Calendar hiện "Paused", slug của nó và "Productivity"; IDMS Portal hiện "Active" cùng chip "User" và "Admin"; không ô nào hiện `ACTIVE`/`inactive`, id 24 ký tự hex hay timestamp ISO.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-011 — Search narrows by name, slug or description and lives in the URL

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** EP (khớp tên hiển thị / chỉ khớp mô tả / slug viết khác hoa-thường)
- **Tiền điều kiện:** các ứng dụng seed
- **Bước:**
  1. Tìm "calendar", rồi "restricted", rồi "IDMS-PORTAL"; tải lại.
- **Mong đợi:** Team Calendar; Operations Console; IDMS Portal; URL mang `search=` và sau khi tải lại vẫn giữ cả giá trị ô lẫn kết quả.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-012 — The status filter shows only paused or only active apps

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** EP (Paused / Active / All)
- **Tiền điều kiện:** các ứng dụng seed
- **Bước:**
  1. Filters → Status → Paused, rồi Active, rồi All.
- **Mong đợi:** Paused → chỉ Team Calendar (`status=inactive`); Active → năm ứng dụng còn lại; All → sáu ứng dụng và không có `status=` trên URL.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-013 — The category filter shows the apps of that category

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** EP (danh mục có 2 ứng dụng)
- **Tiền điều kiện:** các ứng dụng seed
- **Bước:**
  1. Filters → Category → Productivity; tải lại.
- **Mong đợi:** Team Calendar + Notes, `categoryId=<productivity id>` trên URL, vẫn giữ sau khi tải lại.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-014 — Status, category and search combine with AND

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (trạng thái × danh mục × tìm kiếm)
- **Tiền điều kiện:** các ứng dụng seed
- **Bước:**
  1. Mở từng tổ hợp qua URL: active+productivity, inactive+productivity, inactive+internal-tools, active+internal-tools+"ops", internal-tools+"calendar".
  2. Khi có hai bộ lọc đang bật, đọc badge của Filters và bấm "Clear all".
- **Mong đợi:** Notes; Team Calendar; rỗng; Operations Console; rỗng (dòng rỗng hiện "Clear filters"). Badge là 2; Clear all xoá cả hai khỏi URL và danh sách đầy đủ quay lại.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-015 — A search with no match offers Clear filters

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** EP (tìm không khớp), chuyển trạng thái (đã lọc → đã xoá)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tìm "zz-no-such-app-zz", bấm "Clear filters".
- **Mong đợi:** không có dòng nào và có nút "Clear filters"; bấm vào thì `search=` biến mất và sáu ứng dụng quay lại.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-016 — The no-match empty state says nothing matched

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (chọn nhầm câu chữ cho trạng thái)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tìm "zz-no-such-app-zz".
- **Mong đợi:** "No results found" (`list.noResultsTitle`), không phải "No apps registered yet.".
- **Ghi chú:** từng là BUG-ADMINAPPS-01 (đã sửa 2026-10-15).
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-017 — Tampered filter values in the URL do not break the page

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** EP (status không tồn tại), đoán lỗi (categoryId sai định dạng)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?status=bogus`, rồi `?categoryId=not-an-id`.
- **Mong đợi:** cả hai bị bỏ qua như mọi giá trị không khớp lựa chọn lọc nào: danh sách đầy đủ hiện ra, tiêu đề và toolbar vẫn dùng được.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-018 — Filters and status labels render in Vietnamese

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** EP (locale vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/admin/apps`, "Bộ lọc" → Trạng thái → "Tạm dừng".
- **Mong đợi:** nhãn "Trạng thái" / "Danh mục"; chỉ có Team Calendar, badge "Tạm dừng".
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMINAPPS-019 — The list API returns the admin DTO, filters on the server and never leaks a secret

- **Requirement:** REQ-ADMINAPPS-01, REQ-ADMINAPPS-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (status × categoryId × search), EP (tìm theo name / displayName / description, mọi kiểu hoa-thường)
- **Tiền điều kiện:** các ứng dụng seed
- **Bước:**
  1. `GET /admin/apps` không query, với `?status=`, `?categoryId=`, `?search=` và các tổ hợp.
- **Mong đợi:** mọi item có đúng 15 key của DTO; không có `clientSecret` hay hash bcrypt ở đâu; active + inactive = tất cả; kết quả lọc danh mục và tìm kiếm chỉ chứa phần khớp; `status=active&search=team-calendar` rỗng.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-020 — Bad list filters are refused and regex characters are literal

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** EP (status không tồn tại, id sai định dạng), giá trị biên (BVA) (search 200 / 201 ký tự), đoán lỗi (ký tự đặc biệt của regex)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `?status=paused`, `?categoryId=garbage`, `?search=` với `(`, `.*`, `[a-z]+`, `\`, 200 và 201 ký tự.
- **Mong đợi:** 400, 400; input regex trả 200 và `.*` không khớp gì; 200 ký tự → 200, 201 → 400.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-065 — The admin list is not paginated and ignores unknown query keys

- **Requirement:** REQ-ADMINAPPS-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (tham số phân trang mà schema không khai báo), EP (không query / `page` + `limit`)
- **Tiền điều kiện:** các ứng dụng seed
- **Bước:**
  1. `GET /admin/apps` không query; rồi `?page=2&limit=1`.
- **Mong đợi:** 200 cả hai; `data` chỉ có key `items` (không `meta`); `page` / `limit` bị bỏ qua (Q5) nên lần hai trả đúng cùng tập ứng dụng.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

## Tạo mới (REQ-ADMINAPPS-02)

### TC-ADMINAPPS-021 — An admin registers an app with ordered categories

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** EP (tạo hợp lệ, 2 danh mục)
- **Tiền điều kiện:** không có; ứng dụng bị xoá sau đó
- **Bước:**
  1. "Register App"; điền Name, Display Name, Home URL; chọn Identity rồi Content; thêm một redirect URI; tắt Active; "Register".
- **Mong đợi:** danh sách chip là Identity (Primary) rồi Content; sau khi bấm Done dòng hiện với trạng thái Paused; API lưu `categoryIds` theo đúng thứ tự đó.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-022 — An empty register form reports every required field

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (mọi trường bắt buộc đều rỗng; rồi bỏ cả role)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở "Register App", bấm "Register"; bỏ chọn role mặc định "User", bấm lại.
- **Mong đợi:** "Please enter a name.", "Please enter a display name.", "Please enter a home URL.", "Select at least one category.", "Add at least one redirect URI." cùng lúc, rồi "Select at least one role."; không có POST nào được gửi.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-023 — A taken name is reported on the Name field

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (409 `WEB_APP_NAME_EXISTS`)
- **Tiền điều kiện:** ứng dụng seed `blog`
- **Bước:**
  1. Đăng ký một ứng dụng hợp lệ ở mọi mặt nhưng tên là `blog`.
- **Mong đợi:** "An app with this name already exists." trong sheet, sheet vẫn mở.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-024 — A redirect URI only the server refuses keeps the sheet open

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (rule `http(s)://` phía client lỏng hơn rule https-hoặc-loopback của server)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Điền form hợp lệ nhưng redirect URI là `http://e2e.example.com/callback`; "Register".
- **Mong đợi:** POST trả 400; sheet vẫn mở với các giá trị đã gõ và không có dialog credentials.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-025 — The register sheet and its errors render in Vietnamese

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** EP (locale vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `/vi/admin/apps` → "Đăng ký ứng dụng" → "Đăng ký" trên form rỗng.
- **Mong đợi:** tiêu đề "Đăng ký ứng dụng mới"; "Vui lòng nhập tên.", "Hãy chọn ít nhất một danh mục.", "Thêm ít nhất một redirect URI."; không có key thô `[adminApps.…]`.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-026 — Create returns 201 with the given order and the OAuth defaults

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** EP (tạo hợp lệ kèm post-logout URI)
- **Tiền điều kiện:** không có; xoá sau đó
- **Bước:**
  1. `POST /admin/apps` với hai danh mục theo thứ tự chọn sẵn.
  2. Đọc document đã lưu.
- **Mong đợi:** 201; `categoryIds`, status, roles, post-logout URI đúng như đã gửi; phương thức xác thực mặc định là `client_secret_basic`; `grantTypes` đã lưu có `authorization_code`, `responseTypes` = `["code"]`, `scopes` = `openid profile email`.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-027 — An app takes 1 to 5 distinct, existing categories

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (0 / 1 / 5 / 6), EP (id trùng, id sai định dạng, id không tồn tại, thiếu)
- **Tiền điều kiện:** ≥ 5 danh mục (thêm một danh mục tạm nếu cần)
- **Bước:**
  1. Tạo với từng giá trị `categoryIds`.
- **Mong đợi:** 1 và 5 → 201; 0, 6, trùng, sai định dạng, thiếu → 400; id không tồn tại → 4xx `WEB_APP_CATEGORY_NOT_FOUND`.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-028 — Redirect URIs must be absolute https or loopback http, 1–20 of them

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** EP (https / localhost / 127.0.0.1 hợp lệ; http công khai, fragment, wildcard, tương đối, rác, ftp không hợp lệ), giá trị biên (BVA) (0 / 20 / 21)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tạo với từng URI; với 0, 20 và 21 URI; với một post-logout URI dạng http thường.
- **Mong đợi:** phân vùng hợp lệ 201, không hợp lệ 400; 0 → 400, 20 → 201, 21 → 400; post-logout URI theo cùng rule (400).
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-029 — Name, display name, URLs, roles and auth method are validated

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (name 1 / 2 / 64 / 65, display name 1 / 2 / 80 / 81, description 500 / 501), EP (mẫu name, chữ hoa, scheme URL, roles, status, phương thức xác thực)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tạo với từng giá trị.
- **Mong đợi:** name 1 → 400, 2 và 64 → 201, 65 → 400; khoảng trắng, gạch nối đầu, gạch dưới → 400; chữ hoa được chuyển về chữ thường; display name 1 / 81 → 400, 2 / 80 → 201; home URL `ftp://` hoặc rỗng, icon `javascript:`, description 501 ký tự, roles rỗng hoặc không tồn tại, status `paused`, phương thức xác thực `client_secret_post` → 400.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-030 — A taken name is 409 and tampered fields are ignored

- **Requirement:** REQ-ADMINAPPS-02, REQ-ADMINAPPS-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (mass assignment `clientId`, `clientSecret`, `clientSecretHash`, `scopes`, `grantTypes`)
- **Tiền điều kiện:** ứng dụng seed `blog`
- **Bước:**
  1. Tạo `blog` và `BLOG`.
  2. Tạo một ứng dụng mới mà body có kèm các trường bị sửa tay.
- **Mong đợi:** 409 `WEB_APP_NAME_EXISTS` cho cả hai; lần tạo có trường sửa tay trả 201 với client id và secret do server sinh, scope mặc định và không có grant `client_credentials`.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-063 — Surrounding whitespace is trimmed and whitespace-only fields count as empty

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (khoảng trắng đầu/cuối, chỉ có khoảng trắng)
- **Tiền điều kiện:** không có; xoá sau đó
- **Bước:**
  1. `POST /admin/apps` với name, display name, home URL, redirect URI có khoảng trắng hai đầu và description chỉ có khoảng trắng.
  2. Lần lượt gửi name, display name, home URL chỉ có khoảng trắng.
- **Mong đợi:** 201 và mọi giá trị được lưu đã trim, description thành `null`; mỗi trường chỉ có khoảng trắng → 400 và `errors` nêu đúng trường đó.
- **Automated:** `tests/api/admin-apps/validation.api.ts`

### TC-ADMINAPPS-066 — A double-click on Register creates one app

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (double-click submit)
- **Tiền điều kiện:** không có; ứng dụng bị xoá sau đó
- **Bước:**
  1. Điền form đăng ký hợp lệ; bấm "Register" hai lần trong cùng một tick.
- **Mong đợi:** đúng một `POST /admin/apps`; dialog credentials mở; list API chỉ có một ứng dụng mang tên đó.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-067 — Cancelling the register sheet sends nothing and the next open starts empty

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (sheet mở → huỷ → mở lại)
- **Tiền điều kiện:** không có
- **Bước:**
  1. "Register App"; gõ Name và Display Name; "Cancel"; mở lại "Register App".
- **Mong đợi:** sheet đóng, không có POST nào; lần mở sau Name và Display Name rỗng.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-068 — A category deleted while the sheet is open is dropped and reported on its field

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (2 tab: admin khác xoá danh mục giữa chừng → `WEB_APP_CATEGORY_NOT_FOUND`)
- **Tiền điều kiện:** một danh mục tạm tạo qua API trước khi mở trang; xoá sau đó
- **Bước:**
  1. Điền form đăng ký, chọn Content và danh mục tạm.
  2. Xoá danh mục tạm qua API; bấm "Register".
- **Mong đợi:** "One of the selected categories was just deleted. Review the list." trong sheet; danh sách chip bỏ danh mục tạm, giữ Content; sheet vẫn mở và không có dialog credentials.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

## Credentials (REQ-ADMINAPPS-03)

### TC-ADMINAPPS-031 — The client secret is shown once, right after registering

- **Requirement:** REQ-ADMINAPPS-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đã đăng ký → dialog → đóng → không bao giờ hiện lại)
- **Tiền điều kiện:** không có; ứng dụng bị xoá sau đó
- **Bước:**
  1. Đăng ký một ứng dụng (TC-ADMINAPPS-021); đọc dialog; bấm Done; mở lại ứng dụng ở Edit; đọc nó từ list API.
- **Mong đợi:** dialog "App registered — copy your credentials" với Client ID (`client_` + 12 hex), Client Secret (64 hex) và "Store the client secret now — it will not be shown again."; sau đó cả sheet sửa lẫn API đều không hiện secret.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-032 — A public client gets no secret

- **Requirement:** REQ-ADMINAPPS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** EP (phương thức xác thực token `none`)
- **Tiền điều kiện:** không có; xoá sau đó
- **Bước:**
  1. Đăng ký với "Public — no client secret (PKCE only)"; đồng thời `POST` với `tokenEndpointAuthMethod: none`.
- **Mong đợi:** dialog chỉ hiện Client ID, một nút Copy và ghi chú PKCE; API trả `clientSecret: null` và không lưu hash.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`, `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-033 — Copy puts the value on the clipboard and shows Copied

- **Requirement:** REQ-ADMINAPPS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** EP (bấm copy)
- **Tiền điều kiện:** POST được stub với kết quả tạo giả; clipboard được stub
- **Bước:**
  1. Trong dialog credentials bấm Copy cạnh Client ID.
- **Mong đợi:** `aria-label` và chữ trên nút thành "Copied"; clipboard chứa client id.
- **Automated:** `tests/e2e/admin-apps/copy-secret.e2e.ts`

### TC-ADMINAPPS-034 — The Copy button reverts after about two seconds

- **Requirement:** REQ-ADMINAPPS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (timer ~2000 ms)
- **Tiền điều kiện:** như TC-ADMINAPPS-033
- **Bước:**
  1. Bấm Copy và chờ.
- **Mong đợi:** "Copied" trong vòng 2 s, trở lại "Copy" trong vòng 3.5 s.
- **Automated:** `tests/e2e/admin-apps/copy-secret.e2e.ts`

### TC-ADMINAPPS-035 — Rapid copies keep one timer

- **Requirement:** REQ-ADMINAPPS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (reset timer)
- **Tiền điều kiện:** như TC-ADMINAPPS-033
- **Bước:**
  1. Bấm Copy ba lần thật nhanh.
- **Mong đợi:** giữ "Copied", rồi trở lại đúng một lần.
- **Automated:** `tests/e2e/admin-apps/copy-secret.e2e.ts`

### TC-ADMINAPPS-036 — Credentials are unique, well-formed and the secret is stored hashed

- **Requirement:** REQ-ADMINAPPS-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (secret khi lưu trữ)
- **Tiền điều kiện:** không có; xoá sau đó
- **Bước:**
  1. Tạo hai ứng dụng; đọc document của ứng dụng thứ nhất.
- **Mong đợi:** `client_` + 12 hex và secret 64 hex, khác nhau giữa hai ứng dụng; document chứa `clientSecretHash` bcrypt và không bao giờ chứa chính secret.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

## Sửa (REQ-ADMINAPPS-04)

### TC-ADMINAPPS-037 — An admin edits an app's display name

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** EP (sửa hợp lệ) — dòng 1 của edit-apps
- **Tiền điều kiện:** ứng dụng seed Blog; khôi phục sau đó
- **Bước:**
  1. Blog → App actions → Edit; đổi Display Name; "Save Changes".
- **Mong đợi:** toast "App updated." và tên mới trong bảng.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-038 — Without a session the registry is unreachable

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi — dòng 2 của edit-apps
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/apps`; `PATCH /admin/apps/:id` không có token.
- **Mong đợi:** chuyển hướng tới `/login`, không có tiêu đề "App Registry"; PATCH trả 401.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-039 — A non-admin cannot update apps or see them

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (leo thang đặc quyền) — dòng 3 của edit-apps
- **Tiền điều kiện:** session và token của user seed
- **Bước:**
  1. `PATCH /admin/apps/:id` bằng token của user; mở `/admin/apps`.
- **Mong đợi:** 403; guard vai trò phía client đưa user ra khỏi `/admin/apps`, không có dòng ứng dụng nào và không có nút "App actions".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-040 — Each field reports its own validation error

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** EP (display name rỗng / `Blog!` / `ftp://x`) — dòng 4 của edit-apps
- **Tiền điều kiện:** ứng dụng seed Blog; không lưu gì
- **Bước:**
  1. Sửa Blog và lần lượt lưu từng giá trị không hợp lệ.
- **Mong đợi:** "Please enter a display name.", "Use lowercase letters, numbers, and hyphens only.", "Must start with http:// or https://".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-041 — Several errors show at once

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (hai trường sai cùng lúc, tránh kiểu một-yếu-tố-mỗi-lần)
- **Tiền điều kiện:** ứng dụng seed Blog; không lưu gì
- **Bước:**
  1. Xoá Display Name và đặt Name `Blog!`; lưu.
- **Mong đợi:** cả hai thông báo cùng hiện.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-042 — Renaming onto a taken name is reported on the Name field

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (409)
- **Tiền điều kiện:** ứng dụng seed Blog và Notes
- **Bước:**
  1. Sửa Blog, đặt Name `notes`, lưu.
- **Mong đợi:** "An app with this name already exists." bên trong sheet Edit App; Blog giữ nguyên tên.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-043 — Changing only the display name keeps the categories

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chặn hồi quy cho bug select bị reset)
- **Tiền điều kiện:** ứng dụng seed Blog (Content); khôi phục sau đó
- **Bước:**
  1. Sửa Blog, chỉ đổi Display Name, lưu, mở lại.
- **Mong đợi:** danh sách Categories vẫn chứa Content.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-044 — Null description and icon prefill as empty inputs

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (`null` lọt vào input) — dòng 5 của edit-apps, trước đây bị hoãn
- **Tiền điều kiện:** một ứng dụng `e2e-…` tạo qua API với description và icon rỗng (lưu thành `null`); xoá sau đó
- **Bước:**
  1. Sửa ứng dụng đó; lưu mà không đổi gì.
- **Mong đợi:** Description và Icon URL rỗng (không phải `"null"`); lưu thành công ("App updated.").
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-045 — Name length boundaries

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (1 / 2 / 64 / 65)
- **Tiền điều kiện:** ứng dụng seed Blog; không lưu gì
- **Bước:**
  1. Đặt Name dài 1, 65, 2 và 64 ký tự.
- **Mong đợi:** 1 → "Name must be at least 2 characters.", 65 → "Name must not exceed 64 characters.", 2 và 64 xoá lỗi.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-046 — Display name length boundaries

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (2 / 80 / 81)
- **Tiền điều kiện:** ứng dụng seed Blog; không lưu gì
- **Bước:**
  1. Đặt Display Name dài 81, 2 và 80 ký tự.
- **Mong đợi:** 81 → "Display name must not exceed 80 characters."; 2 và 80 xoá lỗi.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-047 — At most 20 redirect URIs

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (21 = max + 1)
- **Tiền điều kiện:** ứng dụng seed Blog; không lưu gì
- **Bước:**
  1. Thêm URI cho tới khi có 21; lưu.
- **Mong đợi:** "You can add at most 20 redirect URIs."; không có PATCH.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-048 — The edit sheet prefills every field

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (mỗi trường một lần kiểm)
- **Tiền điều kiện:** ứng dụng seed Blog
- **Bước:**
  1. Sửa Blog.
- **Mong đợi:** Name `blog`, Display Name `Blog`, Categories "Content" (nhãn, không phải id), có Home URL, công tắc trạng thái bật, role "User" được chọn, ≥ 1 pill redirect URI.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-049 — The edit flow and status badge render in Vietnamese

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** EP (locale vi)
- **Tiền điều kiện:** ứng dụng seed Blog; khôi phục sau đó
- **Bước:**
  1. `/vi/admin/apps` → "Thao tác với ứng dụng" → "Chỉnh sửa"; lưu Tên hiển thị rỗng, rồi một giá trị hợp lệ.
- **Mong đợi:** "Chỉnh sửa ứng dụng"; "Vui lòng nhập tên hiển thị."; toast "Đã cập nhật ứng dụng."; badge của Blog là "Đang hoạt động".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-050 — A server error on save shows one generic toast

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (PATCH được stub trả 500)
- **Tiền điều kiện:** PATCH được stub; không lưu gì
- **Bước:**
  1. Sửa Blog, đổi Display Name, lưu.
- **Mong đợi:** toast "Server error. Please try again later." (handler MutationCache toàn cục), không phải lỗi gắn với trường.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-051 — Controls are disabled while saving

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (rảnh → đang chờ)
- **Tiền điều kiện:** PATCH được stub với độ trễ 1.5 s
- **Bước:**
  1. Lưu một chỉnh sửa.
- **Mong đợi:** "Save Changes" và input Display Name bị disable trong lúc request đang chờ.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-052 — A double-click saves once

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chặn submit lặp)
- **Tiền điều kiện:** ứng dụng seed Blog; khôi phục sau đó
- **Bước:**
  1. Bấm "Save Changes" hai lần trong cùng một tick.
- **Mong đợi:** đúng một PATCH; "App updated.".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-053 — Cancel discards unsaved edits

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi
- **Tiền điều kiện:** ứng dụng seed Blog
- **Bước:**
  1. Đổi Display Name, Cancel, mở lại.
- **Mong đợi:** "Blog" ban đầu quay lại và không có PATCH nào được gửi.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-054 — The server trims a trailing space in the name

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (khoảng trắng)
- **Tiền điều kiện:** ứng dụng seed Blog; khôi phục tên
- **Bước:**
  1. `PATCH` Blog với name `"blog "`.
- **Mong đợi:** 200 và tên đã lưu là `blog`.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-055 — Focus moves to the first invalid field and success is announced

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (a11y)
- **Tiền điều kiện:** ứng dụng seed Blog; khôi phục sau đó
- **Bước:**
  1. Lưu Display Name rỗng; rồi một giá trị hợp lệ.
- **Mong đợi:** Display Name nhận focus; `#announcer` (polite) đọc "App Blog (a11y e2e) updated.".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-056 — PATCH changes only what it is given; bad targets fail

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** EP (body một phần / body rỗng / id sai định dạng / id không tồn tại / tên đã dùng / client id bị sửa tay)
- **Tiền điều kiện:** một ứng dụng `e2e-…`; xoá sau đó
- **Bước:**
  1. `PATCH` display name + đổi thứ tự danh mục; rồi `{}`, `/garbage`, một id không tồn tại, name `notes`, một body có `clientId`.
- **Mong đợi:** 200 và chỉ các trường đó thay đổi (home URL và client id giữ nguyên, không trả về secret); 400; 400; 404 `WEB_APP_NOT_FOUND`; 409; client id không đổi.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMINAPPS-064 — PATCH re-checks categories and folds the name like create

- **Requirement:** REQ-ADMINAPPS-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** EP (danh mục không tồn tại / trùng, redirect URI http công khai, tên của chính nó, tên viết HOA, description rỗng), giá trị biên (BVA) (6 danh mục)
- **Tiền điều kiện:** một ứng dụng `e2e-…`; xoá sau đó
- **Bước:**
  1. `PATCH` lần lượt với từng giá trị.
- **Mong đợi:** danh mục không tồn tại → 400 `WEB_APP_CATEGORY_NOT_FOUND`; 6 danh mục, danh mục trùng, redirect URI `http://` công khai → 400; tên hiện tại của chính nó → 200 (không tự xung đột); tên viết HOA → 200 và lưu chữ thường; description `""` → `null`.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

## Trạng thái (REQ-ADMINAPPS-05)

### TC-ADMINAPPS-057 — Hide then Unhide from the row menu

- **Requirement:** REQ-ADMINAPPS-05
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (active → inactive → active)
- **Tiền điều kiện:** ứng dụng seed Blog; khôi phục sau đó (không phụ thuộc TC-ADMINAPPS-037 — Q9)
- **Bước:**
  1. App actions → Hide → "Hide App"; rồi App actions → Unhide.
- **Mong đợi:** "App hidden." và dòng hiện Paused; rồi "App reactivated." và Active.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMINAPPS-058 — A failing status change shows exactly one error toast

- **Requirement:** REQ-ADMINAPPS-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (toast bị bắn từ hai nơi)
- **Tiền điều kiện:** PATCH được stub trả 500; không có gì thay đổi
- **Bước:**
  1. Unhide một ứng dụng đang tạm dừng (hoặc Hide một ứng dụng đang hoạt động).
- **Mong đợi:** đúng một toast "Server error. Please try again later.".
- **Automated:** `tests/e2e/admin-apps/status-toast.e2e.ts`

### TC-ADMINAPPS-059 — The status switch in the edit sheet pauses and reactivates

- **Requirement:** REQ-ADMINAPPS-05
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (active → inactive → active qua công tắc)
- **Tiền điều kiện:** một ứng dụng `e2e-…` đang hoạt động (role chỉ admin); xoá sau đó
- **Bước:**
  1. Sửa, tắt công tắc, lưu; sửa lại, bật công tắc, lưu.
- **Mong đợi:** dòng chuyển Paused, sheet mở lại hiện công tắc tắt, rồi dòng lại Active.
- **Automated:** `tests/e2e/admin-apps/status.e2e.ts`

### TC-ADMINAPPS-060 — The row menu only offers the valid transition

- **Requirement:** REQ-ADMINAPPS-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (không đưa ra chuyển trạng thái không hợp lệ; Cancel giữ nguyên trạng thái)
- **Tiền điều kiện:** một ứng dụng `e2e-…` đang hoạt động; xoá sau đó
- **Bước:**
  1. Mở menu của ứng dụng đang hoạt động; Hide → Cancel; Hide → "Hide App"; mở lại menu.
- **Mong đợi:** đang hoạt động thì chỉ có Hide; hộp xác nhận hỏi "Hide <name>?" và Cancel giữ Active; khi đã Paused thì menu chỉ có Unhide.
- **Automated:** `tests/e2e/admin-apps/status.e2e.ts`

### TC-ADMINAPPS-061 — An inactive app leaves users' launcher and returns when reactivated

- **Requirement:** REQ-ADMINAPPS-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin, user
- **Kỹ thuật:** chuyển trạng thái (inactive → active → inactive → inactive lần nữa)
- **Tiền điều kiện:** một ứng dụng `e2e-…` có role `user`, tạo ở trạng thái inactive; xoá sau đó
- **Bước:**
  1. Với tư cách user, `GET /apps?search=<name>` sau mỗi lần admin `PATCH status`.
- **Mong đợi:** 0 kết quả khi inactive, 1 khi active, lại 0 sau khi tắt; lặp lại `inactive` trả 200 và không đổi gì.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

## Từ chối input sai (REQ-ADMINAPPS-06)

### TC-ADMINAPPS-062 — Validation errors list every bad field with a message in the caller's language

- **Requirement:** REQ-ADMINAPPS-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (mọi trường bắt buộc thiếu cùng lúc), EP (`Accept-Language` en / vi), đoán lỗi (message của lỗi nghiệp vụ)
- **Tiền điều kiện:** ứng dụng seed `blog`
- **Bước:**
  1. `POST /admin/apps` body `{}` (en); body hợp lệ nhưng name `Blog!` với en rồi vi.
  2. Tạo `blog` (en); `PATCH` một id không tồn tại (en).
- **Mong đợi:** 400 `VALIDATION_ERROR`, message "Validation failed", `errors` có đúng 7 trường bắt buộc (name: "App name is required."); name `Blog!` → một lỗi duy nhất trên `name` với message `webApp.validation.name.invalid` của en, rồi của vi; 409 mang "An app with this name already exists."; 404 mang "App not found.".
- **Automated:** `tests/api/admin-apps/validation.api.ts`

### TC-ADMINAPPS-071 — Wrongly typed fields are refused with 400, never a server error

- **Requirement:** REQ-ADMINAPPS-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (sai kiểu dữ liệu: số, mảng, chuỗi, boolean; body là mảng JSON)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST /admin/apps` với name là số, displayName là mảng, categoryIds / redirectUris / requiredRoles là chuỗi, status là boolean.
  2. `POST` và `PATCH` với body là mảng `[]`.
- **Mong đợi:** mọi trường hợp 400 (`VALIDATION_ERROR` cho từng trường sai kiểu), không trường hợp nào 5xx.
- **Automated:** `tests/api/admin-apps/validation.api.ts`

### TC-ADMINAPPS-072 — A body that is not valid JSON is refused with 400, never a server error

- **Requirement:** REQ-ADMINAPPS-06
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (JSON cắt cụt với `Content-Type: application/json`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST /admin/apps` với body `{"name": "e2e-broken", `.
- **Mong đợi:** 400.
- **Ghi chú:** từng là BUG-OPS-02 (đã sửa 2026-10-15) — lỗi parse của `express.json` từng rơi xuống `handleError` như
  một lỗi lạ → 500; giờ trả 400 `MALFORMED_BODY`.
- **Automated:** `tests/api/admin-apps/validation.api.ts`

## Xác nhận thao tác (REQ-ADMINAPPS-07)

### TC-ADMINAPPS-069 — Registering confirms with a toast and a screen-reader announcement

- **Requirement:** REQ-ADMINAPPS-07, REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (a11y — thông báo cho trình đọc màn hình)
- **Tiền điều kiện:** không có; ứng dụng bị xoá sau đó
- **Bước:**
  1. Ghi lại `#announcer`; đăng ký một ứng dụng hợp lệ.
- **Mong đợi:** toast "App registered."; `#announcer` đã đọc "App E2E <name> registered.".
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMINAPPS-070 — Hiding and unhiding are announced to screen readers

- **Requirement:** REQ-ADMINAPPS-07, REQ-ADMINAPPS-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (a11y), chuyển trạng thái (active → inactive → active)
- **Tiền điều kiện:** một ứng dụng `e2e-…` đang hoạt động (role chỉ admin); xoá sau đó
- **Bước:**
  1. Ghi lại `#announcer`; Hide → "Hide App"; rồi Unhide.
- **Mong đợi:** `#announcer` đã đọc "App <tên> hidden." rồi "App <tên> reactivated.".
- **Automated:** `tests/e2e/admin-apps/status.e2e.ts`
