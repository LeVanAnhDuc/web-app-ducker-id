# ADMINCONTACT — test case

Hộp thư hỗ trợ của admin tại `/admin/contact`: danh sách có tìm kiếm và bộ lọc, trang chi tiết một yêu cầu, luồng trạng thái `new → processing → resolved`, và thông điệp đã dịch của API hộp thư (REQ-ADMINCONTACT-01…04).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/admin-contact.md

## Danh sách — REQ-ADMINCONTACT-01

### TC-ADMINCONTACT-001 — The list shows a short ticket id

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (id 24-hex → 6 ký tự đầu + "...")
- **Tiền điều kiện:** danh sách được stub với `_id` `0123456789abcdef01234567`
- **Bước:**
  1. Mở `/admin/contact`.
- **Mong đợi:** ô ticket hiện `012345...`; id đầy đủ không hiện.
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMINCONTACT-002 — No category column, no leaked key

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (cột đã bỏ)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở `/admin/contact`.
- **Mong đợi:** không có header cột "Category"/"Danh mục"; không có chữ
  `contactAdmin.form.category`.
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMINCONTACT-003 — No attachments column

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (cột đã bỏ)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở `/admin/contact`.
- **Mong đợi:** không có header cột "Files"/"Tệp".
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMINCONTACT-004 — The filter panel has no category or ticket filter

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (bộ lọc đã bỏ)
- **Tiền điều kiện:** danh sách được stub
- **Bước:**
  1. Mở panel Filters.
- **Mong đợi:** có "Status"; không có "Category", "Danh mục", "Ticket Number",
  "Mã ticket".
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMINCONTACT-006 — English list and detail id display

- **Requirement:** REQ-ADMINCONTACT-01, REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** danh sách và chi tiết được stub
- **Bước:**
  1. Mở `/admin/contact`, rồi trang chi tiết.
- **Mong đợi:** `012345...` trong danh sách, không có cột category / files, không lộ key
  `contactAdmin.admin.list`; id đầy đủ ở h2 và breadcrumb của trang chi tiết (không phải
  "Detail").
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMINCONTACT-007 — Vietnamese list and detail id display

- **Requirement:** REQ-ADMINCONTACT-01, REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** danh sách và chi tiết được stub
- **Bước:**
  1. Mở `/vi/admin/contact`, rồi trang chi tiết.
- **Mong đợi:** như TC-ADMINCONTACT-006, không có "Danh mục"/"Tệp" và
  breadcrumb không phải "Chi tiết".
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMINCONTACT-010 — A filed request appears in the inbox as New

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (yêu cầu mới tạo)
- **Tiền điều kiện:** một yêu cầu do guest gửi kèm email người báo
- **Bước:**
  1. Mở `/admin/contact`.
- **Mong đợi:** heading "Contact Requests"; các cột Ticket, Email, Subject,
  Status, Date; dòng của yêu cầu hiện email, "New" và id rút gọn của nó.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-011 — Search by subject or email

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (một đoạn subject, email viết hoa, không khớp và có
  ký tự regex)
- **Tiền điều kiện:** đã gửi các yêu cầu của chính test
- **Bước:**
  1. Gõ phần cuối của subject vào ô tìm kiếm.
  2. Mở `?search=<EMAIL IN CAPS>`.
  3. Mở `?search=zzz-no-such-ticket-(.*)`, bấm "Clear filters".
- **Mong đợi:** (1) URL có `search=`, đúng một dòng đó được liệt kê; (2) yêu cầu
  được liệt kê; (3) "No contact requests found", rồi danh sách trở lại
  không còn `search=`.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-012 — Status filter

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (new, processing, resolved)
- **Tiền điều kiện:** yêu cầu của test đã chuyển sang processing
- **Bước:**
  1. Mở `?search=<subject>&status=` processing / new / resolved.
- **Mong đợi:** chỉ được liệt kê (badge "Processing") dưới processing; trạng thái
  rỗng dưới hai giá trị còn lại.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-013 — Email filter matches part of the address

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (một phần local part)
- **Tiền điều kiện:** yêu cầu của test có email người báo duy nhất
- **Bước:**
  1. Mở `?email=<local part>`.
- **Mong đợi:** request mang `email=`; đúng một dòng đó được liệt kê.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-014 — Search and status combine

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (search × status)
- **Tiền điều kiện:** yêu cầu của test ở trạng thái new
- **Bước:**
  1. Mở `?search=<subject>&status=new`, rồi `…&status=resolved`.
- **Mong đợi:** được liệt kê; trạng thái rỗng.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-015 — Panel status choice writes the URL; junk is dropped

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (trang 2 → lọc → trang 1), phân vùng tương đương (EP) (status không hợp lệ)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `?status=closed&page=2`.
  2. Filters → Status → "Resolved".
- **Mong đợi:** (1) request không có `status`; (2) URL `status=resolved`,
  `page=1`, và request mang `status=resolved`.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-016 — A date-range preset sends a window

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (preset hôm nay)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Filters → "Date range" → "Today".
- **Mong đợi:** URL `dateRange=today`; request mang `fromDate` và
  `toDate`.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-017 — A row opens its request

- **Requirement:** REQ-ADMINCONTACT-01, REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** yêu cầu của test
- **Bước:**
  1. Bấm link của dòng "View details for ticket <id>".
- **Mong đợi:** URL `/admin/contact/<id>`; heading "Contact Detail"; subject
  được hiển thị.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-018 — A guest is sent to sign in

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (chưa xác thực → /login)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/contact` khi không có session.
- **Mong đợi:** trình duyệt về `/login`.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-030 — List API contract

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** một yêu cầu của test
- **Bước:**
  1. `GET /api/v1/admin/contacts`.
- **Mong đợi:** envelope 200; `meta` `{ page: 1, limit: 20, total, totalPages }`;
  yêu cầu nằm ở trang 1 với subject của nó, status `new`, priority `medium`;
  mới nhất trước; item của danh sách không mang `message`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-031 — List filters return exactly the matching requests

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (search × status × email × priority × date)
- **Tiền điều kiện:** một yêu cầu của test ở trạng thái processing với email duy nhất
- **Bước:**
  1. Lọc theo subject (nguyên văn và viết hoa), một đoạn email, và từng
     tổ hợp với status, priority và khoảng ngày khớp / không khớp;
     search `.*`.
- **Mong đợi:** tổ hợp khớp trả đúng yêu cầu đó; bất kỳ bộ lọc nào không khớp
  trả `[]`; `.*` trả `[]`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-032 — List query validation

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (page 0/1, limit 0/1/100/101, search 200/201, fromDate >
  toDate), phân vùng tương đương (EP) (status, priority, sortBy, ngày)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi danh sách với từng giá trị.
- **Mong đợi:** giá trị hợp lệ → 200; không hợp lệ → 400 `VALIDATION_ERROR`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-034 — Only admins reach the inbox endpoints

- **Requirement:** REQ-ADMINCONTACT-01, REQ-ADMINCONTACT-02, REQ-ADMINCONTACT-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest, user
- **Kỹ thuật:** bảng quyết định (vai trò × endpoint)
- **Tiền điều kiện:** không có (id giữ chỗ)
- **Bước:**
  1. Gọi danh sách, chi tiết và đổi trạng thái khi không có token và khi có token
     user.
- **Mong đợi:** 401 `AUTH_MISSING_TOKEN`; 403 `AUTH_ADMIN_ONLY`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-036 — Paging past the last page returns no rows

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (`limit=1`: trang 1, trang cuối = `totalPages`, trang `totalPages + 1`)
- **Tiền điều kiện:** ít nhất một yêu cầu của test
- **Bước:**
  1. `GET /admin/contacts?limit=1&page=1`, rồi `page=<totalPages>`, rồi `page=<totalPages + 1>`.
- **Mong đợi:** trang 1 và trang cuối mỗi trang một dòng, `totalPages` = `total`; trang quá cuối trả `items: []`,
  `meta.page` là trang đã hỏi, `totalPages` không đổi.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-037 — Sorting follows sortBy and sortOrder

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (`createdAt` asc, `status` asc; mặc định mới nhất trước ở TC-ADMINCONTACT-030)
- **Tiền điều kiện:** ít nhất một yêu cầu của test
- **Bước:**
  1. `GET /admin/contacts?sortBy=createdAt&sortOrder=asc&limit=100`.
  2. `GET /admin/contacts?sortBy=status&sortOrder=asc&limit=100`.
- **Mong đợi:** (1) `createdAt` tăng dần; (2) `status` không giảm (`new` → `processing` → `resolved`).
- **Ghi chú:** thứ tự của `sortBy=priority` là thứ tự chuỗi, không kiểm (decisions Q7).
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-038 — A request without a reply email shows a dash and no Email field

- **Requirement:** REQ-ADMINCONTACT-01, REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (email trống → `null`)
- **Tiền điều kiện:** một yêu cầu do guest gửi không kèm email
- **Bước:**
  1. Mở `/admin/contact?search=<subject>`.
  2. Mở trang chi tiết của nó.
- **Mong đợi:** (1) ô Email của dòng là "—"; (2) không có trường "Email" trên thẻ chi tiết.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMINCONTACT-041 — Search and email filter ignore surrounding whitespace

- **Requirement:** REQ-ADMINCONTACT-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (khoảng trắng đầu / cuối)
- **Tiền điều kiện:** một yêu cầu của test có email duy nhất
- **Bước:**
  1. `search=<hai khoảng trắng><subject><hai khoảng trắng>`.
  2. `email=<hai khoảng trắng><local part><hai khoảng trắng>`.
- **Mong đợi:** mỗi lần trả đúng yêu cầu đó.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

## Chi tiết — REQ-ADMINCONTACT-02

### TC-ADMINCONTACT-005 — Detail shows the full id in heading and breadcrumb

- **Requirement:** REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (id 24-hex)
- **Tiền điều kiện:** chi tiết được stub
- **Bước:**
  1. Mở `/admin/contact/0123456789abcdef01234567`.
- **Mong đợi:** heading "Contact Detail"; h2 là id đầy đủ; mục cuối của breadcrumb
  là id đầy đủ (không phải "Detail"); không có id rút gọn; không có trường category.
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMINCONTACT-020 — Detail shows the request

- **Requirement:** REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (yêu cầu có email và tin nhắn hai dòng)
- **Tiền điều kiện:** yêu cầu của test
- **Bước:**
  1. Mở trang chi tiết của nó.
- **Mong đợi:** h2 = id đầy đủ; các nhãn Email, Subject, Message, Updated At; email
  người báo, subject và dòng thứ hai của tin nhắn; badge "New"; "No
  attachments"; link breadcrumb "Contact Inbox".
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMINCONTACT-024 — Unknown and malformed ids

- **Requirement:** REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (id không tồn tại, id sai định dạng)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/contact/000000000000000000000000` và `/admin/contact/not-a-ticket`.
- **Mong đợi:** toast "Contact request not found" / "Validation failed"; không có
  thẻ chi tiết (không có select trạng thái).
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMINCONTACT-026 — Vietnamese detail and status update

- **Requirement:** REQ-ADMINCONTACT-02, REQ-ADMINCONTACT-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** yêu cầu của test
- **Bước:**
  1. Mở `/vi/admin/contact/<id>`, đặt trạng thái "Đang xử lý".
- **Mong đợi:** heading "Chi tiết liên hệ"; các nhãn "Tiêu đề", "Tin nhắn",
  "Cập nhật lần cuối"; badge "Mới" rồi "Đang xử lý"; toast "Cập nhật trạng
  thái thành công"; không lộ key `contactAdmin.`.
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMINCONTACT-027 — Detail shows who filed a signed-in request

- **Requirement:** REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (yêu cầu có chủ sở hữu)
- **Tiền điều kiện:** một yêu cầu do `user@test.com` gửi khi đã đăng nhập
- **Bước:**
  1. Mở trang chi tiết của nó.
- **Mong đợi:** có trường "User ID" chứa id của người gửi.
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts` —
  `test.fail()`: **BUG** — yêu cầu có lưu `userId`, nhưng
  `toContactDetailItemDto` bỏ mất nó (và trường "IP Address" của thẻ luôn
  trống: không có `ipAddress` nào được lưu hay trả về).

### TC-ADMINCONTACT-033 — Detail API contract and id errors

- **Requirement:** REQ-ADMINCONTACT-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP), đoán lỗi (id sai định dạng, id không tồn tại)
- **Tiền điều kiện:** yêu cầu của test có email
- **Bước:**
  1. Đọc chi tiết của nó; đọc `not-a-ticket` và `000000000000000000000000`.
- **Mong đợi:** 200 với `_id`, subject, message, email, status `new`; 400
  `VALIDATION_ERROR`; 404 `CONTACT_NOT_FOUND`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-039 — The breadcrumb leads back to the inbox

- **Requirement:** REQ-ADMINCONTACT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chi tiết → danh sách, quay lui)
- **Tiền điều kiện:** yêu cầu của test
- **Bước:**
  1. Mở trang chi tiết của nó, bấm "Contact Inbox" trên breadcrumb.
- **Mong đợi:** URL `/admin/contact`; heading "Contact Requests".
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

## Luồng trạng thái — REQ-ADMINCONTACT-03

### TC-ADMINCONTACT-021 — new → processing → resolved

- **Requirement:** REQ-ADMINCONTACT-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đường hợp lệ)
- **Tiền điều kiện:** yêu cầu của test ở trạng thái new
- **Bước:**
  1. Ở trang chi tiết, chọn "Processing", rồi "Resolved".
  2. Tìm nó trong danh sách dưới `status=resolved`.
- **Mong đợi:** mỗi lựa chọn gửi `PATCH …/status` `{ status }` → 200, toast
  "Status updated successfully", cập nhật badge và thông báo "Status
  updated successfully."; danh sách hiện "Resolved". Test API đọc lại
  trạng thái sau mỗi bước.
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`, `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-022 — The select offers exactly the three states

- **Requirement:** REQ-ADMINCONTACT-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** yêu cầu của test ở trạng thái new
- **Bước:**
  1. Mở select trạng thái.
- **Mong đợi:** hiện "New"; các lựa chọn New, Processing, Resolved theo đúng
  thứ tự đó; New đang được chọn.
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMINCONTACT-023 — Invalid status changes are refused

- **Requirement:** REQ-ADMINCONTACT-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đích không hợp lệ), đoán lỗi (id không tồn tại
  / sai định dạng)
- **Tiền điều kiện:** yêu cầu của test ở trạng thái processing
- **Bước:**
  1. PATCH status `closed`, `NEW`, `""`, `null`, thiếu, `["resolved"]`.
  2. PATCH một id không tồn tại và một id sai định dạng.
- **Mong đợi:** mỗi body không hợp lệ → 400 `VALIDATION_ERROR` và yêu cầu vẫn
  `processing`; id không tồn tại → 404 `CONTACT_NOT_FOUND`; sai định dạng → 400.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-025 — A failed status change leaves the status as it was

- **Requirement:** REQ-ADMINCONTACT-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** yêu cầu của test; PATCH trạng thái được stub trả 500
- **Bước:**
  1. Chọn "Processing"; tải lại trang.
- **Mong đợi:** "Server error. Please try again later."; `#announcer` "Failed
  to update status."; sau khi tải lại badge vẫn là "New".
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMINCONTACT-028 — Reopening and skipping are accepted

- **Requirement:** REQ-ADMINCONTACT-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (resolved → new, new → resolved, new → new)
- **Tiền điều kiện:** yêu cầu của test ở trạng thái new
- **Bước:**
  1. Đặt resolved (bỏ qua processing), rồi new, rồi new lần nữa.
- **Mong đợi:** mỗi bước 200 và được lưu.
- **Ghi chú:** hành vi hiện tại: luồng trong REQ-ADMINCONTACT-03 không được server
  hay UI ép buộc — select luôn cho chọn cả ba trạng thái. Ghi lại để một guard
  sau này là thay đổi có chủ đích.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMINCONTACT-040 — The status select is locked while a change is in flight

- **Requirement:** REQ-ADMINCONTACT-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (double submit)
- **Tiền điều kiện:** yêu cầu của test ở trạng thái new; PATCH trạng thái bị giữ lại tới khi test thả
- **Bước:**
  1. Chọn "Processing"; trong lúc PATCH còn chờ, xem select.
  2. Thả PATCH.
- **Mong đợi:** (1) select bị disable; (2) PATCH 200, select bật lại, badge "Processing".
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

## Thông điệp — REQ-ADMINCONTACT-04

### TC-ADMINCONTACT-035 — Inbox responses carry translated messages, not catalogue keys

- **Requirement:** REQ-ADMINCONTACT-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (key i18n thiếu trong catalogue)
- **Tiền điều kiện:** yêu cầu của test
- **Bước:**
  1. Gọi danh sách, chi tiết và đổi trạng thái hợp lệ.
  2. Gọi chi tiết với `not-a-ticket`, đổi trạng thái với `closed` và với body rỗng.
- **Mong đợi:** (1) `message` của mỗi phản hồi 200 không phải key (`success.…`); (2) mọi `errors[].message` không phải
  key (`contactAdmin:errors.…`).
- **Automated:** `tests/api/admin-contact/contacts.api.ts` — `test.fail()`: **BUG** BUG-ADMINCONTACT-02 — các key
  `success.getContactList` / `getContactDetail` / `updateContactStatus` và `errors.invalidId` / `statusInvalid` /
  `statusRequired` không có trong `contactAdmin.json`.
