# SUPPORT — test case

Gửi yêu cầu hỗ trợ từ support dialog (guest và đã đăng nhập), danh sách yêu cầu của chính user ở `/contacts/me` kèm ticket id và trạng thái, và trang chi tiết chỉ đọc.
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/support.md

### TC-SUPPORT-001 — My Requests lists own requests and opens the detail

- **Requirement:** REQ-SUPPORT-02, REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** happy path
- **Tiền điều kiện:** các yêu cầu mẫu đã seed
- **Bước:**
  1. Mở `/contacts/me`; bấm vào một dòng.
- **Mong đợi:** ticket dạng ShortId, tiêu đề, badge "New", priority "High", một
  `<time>`; dòng mở `/contacts/me/<id>` với "Request Detail" và không có
  control đổi trạng thái.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-002 — A guest is sent to login

- **Requirement:** REQ-SUPPORT-02, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (không session)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/contacts/me`.
- **Mong đợi:** URL `/login`.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-003 — The list endpoint without a token

- **Requirement:** REQ-SUPPORT-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (không token)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api/v1/contacts` không kèm token.
- **Mong đợi:** 401.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-004 — Guest and other users' requests never appear

- **Requirement:** REQ-SUPPORT-02, REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (rò dữ liệu)
- **Tiền điều kiện:** yêu cầu guest đã seed "Cannot login with Google OAuth"
- **Bước:**
  1. Mở `/contacts/me`.
- **Mong đợi:** hiện yêu cầu của chính mình; không có yêu cầu của guest.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-005 — Tampered status / page params are sanitised

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (`status=xyz`, `page=abc`)
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Mở `?status=xyz`, rồi `?page=abc`.
- **Mong đợi:** cả hai lần đều render bảng không lọc.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-006 — No-match search and Clear filters

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (không khớp), chuyển trạng thái (đã xoá lọc)
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Mở `?search=zzznomatch99999`; bấm "Clear filters".
- **Mong đợi:** trạng thái rỗng có "Clear filters"; sau đó không còn `search` và danh sách trở lại.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-007 — Page boundaries in the URL

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (page 0, -1, 9999)
- **Tiền điều kiện:** yêu cầu đã seed (một trang)
- **Bước:**
  1. Mở `?page=0`, `?page=-1`, `?page=9999`.
- **Mong đợi:** 0 và -1 render trang 1; 9999 dừng ở bảng hoặc trạng thái rỗng, không crash.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-008 — Status filter

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (status = resolved)
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Mở `?status=resolved`.
- **Mong đợi:** chỉ có mẫu resolved.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-009 — Search by subject, persisted in the URL

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (khớp một phần)
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Gõ "dark mode".
- **Mong đợi:** `search=dark` có trong URL sau debounce; chỉ còn yêu cầu dark-mode.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-010 — Status and search combine

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (status × search)
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Mở `?status=processing&search=billing`.
- **Mong đợi:** chỉ có yêu cầu billing.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-011 — Filters survive a reload

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (trạng thái URL qua reload)
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Mở `?search=billing&status=processing`; reload.
- **Mong đợi:** cả hai param và dòng vẫn giữ nguyên.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-012 — Status badge and date are rendered for people

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (enum thô / ISO)
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Mở `?status=new`; đọc cột ngày.
- **Mong đợi:** "New", không bao giờ là "new" trần; ngày không phải timestamp ISO.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-013 — The ticket id is the ShortId form

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** kiểm tra đặc tả
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Mở `/contacts/me`.
- **Mong đợi:** ô ticket khớp `^[0-9a-f]{6}\.\.\.$`, không bao giờ là id 24 hex.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-014 — My Requests in English

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/contacts/me`.
- **Mong đợi:** "My Requests", cột "Ticket", "Submit new request"; không có key `[contactAdmin.`.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-015 — My Requests in Vietnamese

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/contacts/me`.
- **Mong đợi:** "Yêu cầu của tôi", "Mã ticket", "Gửi yêu cầu mới"; không có key thô.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-016 — Loading skeleton and a failing list

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (đang tải → đã tải), đoán lỗi (5xx)
- **Tiền điều kiện:** danh sách bị làm trễ / stub trả 500
- **Bước:**
  1. Mở trang với response bị trễ; rồi với 500.
- **Mong đợi:** một skeleton pulse, rồi dữ liệu; sau các lần retry trang dừng ở
  trạng thái rỗng mà không crash.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-017 — A request submitted from My Requests appears in the list

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (form → thành công → refetch danh sách)
- **Tiền điều kiện:** không có (yêu cầu bị xoá trong afterAll)
- **Bước:**
  1. "Submit new request", điền tiêu đề và nội dung, gửi, đóng.
- **Mong đợi:** có ShortId trên màn hình thành công; tiêu đề mới có trong danh sách.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-018 — My Requests accessibility

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y
- **Tiền điều kiện:** yêu cầu đã seed
- **Bước:**
  1. Kiểm tên của ô tìm kiếm và Filters, focus link của một dòng, đọc badge, mở/Escape Filters.
- **Mong đợi:** control có tên; "View details for ticket …" nhận được focus; badge
  dạng chữ; Escape đóng popover.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-019 — The detail page is read-only

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** happy path
- **Tiền điều kiện:** một yêu cầu của chính mình (đọc qua API)
- **Bước:**
  1. Mở `/contacts/me/<id>`.
- **Mong đợi:** tiêu đề trang, tiêu đề yêu cầu, "Message", một ngày, breadcrumb; không có
  combobox trạng thái hay nút cập nhật.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-020 — A request owned by nobody else is not reachable

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (IDOR)
- **Tiền điều kiện:** một yêu cầu guest mới tạo
- **Bước:**
  1. Mở `/contacts/me/<guest id>`; `GET /api/v1/contacts/<guest id>` bằng token của user.
- **Mong đợi:** "This request could not be found." và không lộ nội dung nào của nó; API trả 404.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-021 — Absent and malformed ids render not-found

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (id đúng định dạng nhưng không tồn tại / id sai định dạng)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/contacts/me/ffff…ffff`, rồi `/contacts/me/not-a-valid-object-id`.
- **Mong đợi:** cả hai lần đều hiện alert not-found, không crash.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-022 — Detail page in English and Vietnamese

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (en + vi)
- **Tiền điều kiện:** một yêu cầu của chính mình
- **Bước:**
  1. Mở trang chi tiết ở `/` và `/vi`.
- **Mong đợi:** "Request Detail" / "My Requests" / "Message"; "Chi tiết yêu
  cầu" / "Yêu cầu của tôi" / "Tin nhắn"; không có key thô.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-023 — Not-found in Vietnamese

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/contacts/me/ffff…ffff`.
- **Mong đợi:** "Không tìm thấy yêu cầu này."
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-024 — Detail accessibility

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y
- **Tiền điều kiện:** một yêu cầu của chính mình
- **Bước:**
  1. Kiểm các heading, focus link breadcrumb, mở một id không tồn tại.
- **Mong đợi:** tiêu đề trang rồi đến một h2; link breadcrumb nhận được focus;
  trạng thái not-found là `role=alert`.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-030 — A guest submits from the support dialog

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** happy path, chuyển trạng thái (form → thành công)
- **Tiền điều kiện:** một địa chỉ throwaway
- **Bước:**
  1. `/login/alternative?email=<address>` → "Contact administrator"; điền
     tiêu đề và nội dung; "Send request".
- **Mong đợi:** email được điền sẵn và sửa được ("Email pre-filled —
  change it if needed."); POST → 201; "Thanks for reaching out", "Request
  code" và ShortId của id trả về.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-031 — A signed-in user submits from the user menu

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-02, REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway user
- **Kỹ thuật:** happy path, chuyển trạng thái (dialog → danh sách)
- **Tiền điều kiện:** tài khoản throwaway đã đăng nhập trên trình duyệt
- **Bước:**
  1. User menu → "Support"; điền; gửi; đóng; mở `/contacts/me`.
- **Mong đợi:** email là của tài khoản và chỉ đọc ("We'll reply to
  your account email."); có ShortId; yêu cầu là dòng duy nhất của My Requests.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-032 — Message length rules and exact minimums

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (message 0 / 19 / 20, subject 5)
- **Tiền điều kiện:** không có (case được chấp nhận stub POST)
- **Bước:**
  1. Gửi với message rỗng và message 19 ký tự; rồi 5 / 20 ký tự.
- **Mong đợi:** "Please enter message" / "Message must be at least 20
  characters", `aria-invalid="true"`, không gửi gì; ở mức tối thiểu bộ
  đếm hiện "20 characters" và màn hình thành công xuất hiện.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-033 — Submit another and close

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (thành công → form → đóng)
- **Tiền điều kiện:** stub POST
- **Bước:**
  1. Gửi; "Submit another request"; Escape.
- **Mong đợi:** form trống; dialog đóng.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-034 — A rate-limited submit keeps the form and says why

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (429)
- **Tiền điều kiện:** stub POST trả 429
- **Bước:**
  1. Gửi.
- **Mong đợi:** `#announcer` đọc "Too many requests. Please wait before
  trying again."; tiêu đề được giữ; không có màn hình thành công.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-035 — The dialog in Vietnamese

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `/vi/login/alternative?email=…` → "Liên hệ quản trị viên".
- **Mong đợi:** dialog "Liên hệ hỗ trợ" với "Email phản hồi", "Tiêu đề",
  "Mô tả chi tiết", "Tối thiểu 20 ký tự", "Gửi yêu cầu"; không có key thô.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-036 — Subject length errors are shown

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (subject 0 / 4 / 201)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gửi với từng tiêu đề không hợp lệ và một message hợp lệ.
- **Mong đợi:** không gửi gì và hiện "Please enter subject" / "Subject must be
  at least 5 characters" / "Subject must not exceed 200 characters".
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts` — BUG-SUPPORT-01 (đã sửa 2026-10-15): `SubjectField` từng không phải
  `FormField`, nên lỗi zod của nó không được render và input giữ `aria-invalid="false"`.

### TC-SUPPORT-037 — An account with no requests sees the empty state

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway user
- **Kỹ thuật:** giá trị biên (BVA) (0 yêu cầu)
- **Tiền điều kiện:** một tài khoản mới đã đăng nhập trên trình duyệt
- **Bước:**
  1. Mở `/contacts/me`; bấm "Submit new request".
- **Mong đợi:** "No requests submitted yet", không có bảng và không có "Clear filters";
  support dialog mở ra.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-040 — A guest submit is accepted and owned by nobody

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest, user
- **Kỹ thuật:** phân vùng tương đương (guest)
- **Tiền điều kiện:** không có
- **Bước:**
  1. POST với subject, message và email; GET id đó với tư cách user đã seed.
- **Mong đợi:** 201, id 24 hex, status "new", email được trả lại; 404 với user.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-041 — A signed-in submit is attached to the caller

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway user
- **Kỹ thuật:** chuyển trạng thái (gửi → danh sách → chi tiết)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. POST kèm token; lấy danh sách; GET id.
- **Mong đợi:** 201; danh sách đúng là yêu cầu đó (total 1); chi tiết trả về nó.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-042 — Submit validation boundaries

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (subject 4 / 5 / 200 / 201, message 19 / 20 / 5000 / 5001), phân vùng tương đương (thiếu field, email không hợp lệ / rỗng, subject chỉ có khoảng trắng)
- **Tiền điều kiện:** không có
- **Bước:**
  1. POST từng body.
- **Mong đợi:** 4, 201, 19, 5001 ký tự, thiếu field, email không hợp lệ và
  subject chỉ có khoảng trắng → 400 kèm `code`; 5, 200, 20, 5000 và email
  rỗng → 201.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-043 — Submits are rate limited per IP

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (request thứ 5 / thứ 6)
- **Tiền điều kiện:** counter rate limit được xoá lúc bắt đầu (`keepRateLimits`)
- **Bước:**
  1. POST sáu request hợp lệ.
- **Mong đợi:** năm lần 201, rồi 429 kèm `code` lỗi.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-044 — My-requests paging, filters and validation

- **Requirement:** REQ-SUPPORT-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** giá trị biên (BVA) (limit 2 trên 3 dòng: trang 1 / 2 / 3), phân vùng tương đương (status, search, param không hợp lệ)
- **Tiền điều kiện:** ba yêu cầu của chính mình
- **Bước:**
  1. Lật qua các trang; lọc `status=new|resolved`; tìm một tiêu đề; các giá trị không hợp lệ.
- **Mong đợi:** 2 + 1 + 0 dòng, total 3 / 2 trang; new = 3, resolved = 0; tìm kiếm
  trả đúng một; page 0, limit 0 / 101, status / sortBy / sortOrder không biết
  và search 201 ký tự → 400.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-045 — Another user's request is not listed or reachable

- **Requirement:** REQ-SUPPORT-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** hai throwaway user
- **Kỹ thuật:** đoán lỗi (IDOR), phân vùng tương đương (id sai định dạng / không tồn tại)
- **Tiền điều kiện:** Alice có một yêu cầu
- **Bước:**
  1. Bob lấy danh sách, GET id của Alice, một id sai định dạng, một id không tồn tại, và inbox admin.
- **Mong đợi:** danh sách rỗng; 404 không lộ nội dung của Alice; 400; 404; 403.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-046 — My requests need a session; submitting does not

- **Requirement:** REQ-SUPPORT-02, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** bảng quyết định (endpoint × token không có / rác)
- **Tiền điều kiện:** không có
- **Bước:**
  1. GET danh sách và chi tiết không kèm token; POST submit với `Bearer garbage`.
- **Mong đợi:** 401, 401; token rác bị từ chối (401 / 403), không bị coi là guest.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-047 — The own-request detail contract

- **Requirement:** REQ-SUPPORT-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** throwaway user
- **Kỹ thuật:** kiểm tra đặc tả
- **Tiền điều kiện:** một yêu cầu của chính mình
- **Bước:**
  1. GET `/contacts/<id>`.
- **Mong đợi:** `_id`, subject, message, status "new", priority là một trong
  low / medium / high và một `createdAt` hợp lệ.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-048 — Length is counted after markup and whitespace are stripped

- **Requirement:** REQ-SUPPORT-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (độ dài sau khi làm sạch 4 / 5), đoán lỗi (đệm khoảng trắng, bọc thẻ)
- **Tiền điều kiện:** không có
- **Bước:**
  1. POST với tiêu đề `"   abcd   "`, `<b>abcd</b>`, `<b>abcde</b>`; rồi nội dung `<p>` + 19 ký tự + `</p>`.
- **Mong đợi:** 400 kèm `code` cho các giá trị còn 4 / 19 ký tự sau khi làm sạch; `<b>abcde</b>` (còn 5) → 201.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-049 — Markup is stripped before a request is stored

- **Requirement:** REQ-SUPPORT-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** bảo mật (stored XSS)
- **Tiền điều kiện:** không có
- **Bước:**
  1. POST với tiêu đề và nội dung chứa `<img src="x" onerror="alert(1)">`; đọc document đã lưu.
- **Mong đợi:** 201; tiêu đề và nội dung đã lưu (và trong response) không còn thẻ `<img`.
- **Automated:** `tests/api/support/contact.api.ts` (từng là BUG-SUPPORT-02, đã sửa 2026-10-15: lưu bản đã làm sạch).

### TC-SUPPORT-050 — The body cannot set status, priority or owner

- **Requirement:** REQ-SUPPORT-04, REQ-SUPPORT-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user, user
- **Kỹ thuật:** bảo mật (mass assignment), phân vùng tương đương (trường lạ trong body)
- **Tiền điều kiện:** một tài khoản mới
- **Bước:**
  1. POST kèm token, body thêm `status: "resolved"`, `priority: "high"`, `userId` = id của user đã seed.
  2. Lấy danh sách của người gửi; GET id đó bằng token của user đã seed.
- **Mong đợi:** 201 với status `new`, priority `medium`; yêu cầu là dòng duy nhất trong danh sách người gửi; 404 với
  user đã seed.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-051 — My requests are newest first and can be sorted

- **Requirement:** REQ-SUPPORT-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** throwaway user
- **Kỹ thuật:** phân vùng tương đương (sortBy createdAt / priority / status, sortOrder asc / mặc định)
- **Tiền điều kiện:** ba yêu cầu của chính mình, gửi lần lượt
- **Bước:**
  1. GET danh sách không tham số; `sortBy=createdAt&sortOrder=asc`; `sortBy=priority`; `sortBy=status`.
- **Mong đợi:** mặc định mới nhất trước; asc đảo ngược; sort theo priority / status trả 200 với đủ 3 dòng.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-052 — Regex characters in search are matched literally

- **Requirement:** REQ-SUPPORT-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** throwaway user
- **Kỹ thuật:** đoán lỗi (ký tự đặc biệt của regex), bảo mật (không 5xx)
- **Tiền điều kiện:** một yêu cầu của chính mình
- **Bước:**
  1. Tìm `.*`, `(`, `[a-z]+`, `\`; rồi một mảnh chữ có trong tiêu đề.
- **Mong đợi:** ký tự đặc biệt → 200 và rỗng (không khớp như pattern, không 500); mảnh chữ thật → đúng yêu cầu đó.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-053 — A guest opening a request detail is sent to login

- **Requirement:** REQ-SUPPORT-03, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (nhảy cóc vào trang chi tiết khi chưa đăng nhập)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/contacts/me/<id>`.
- **Mong đợi:** URL `/login`.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-054 — A guest opens Support from the user menu with an empty email

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (điểm mở: user menu khi chưa đăng nhập)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `/login` → user menu → "Support"; điền tiêu đề và nội dung, để trống email; "Send request".
- **Mong đợi:** email trống, sửa được, hint "Enter the email where you'd like to receive our reply."; POST → 201 và màn
  hình thành công có ShortId.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-055 — An invalid reply-to email is refused with its message

- **Requirement:** REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (email sai định dạng)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở dialog từ `/login/alternative`; đổi email thành `not-an-email`; điền tiêu đề và nội dung hợp lệ; gửi.
- **Mong đợi:** không gửi gì và hiện "Invalid email format".
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts` — BUG-SUPPORT-03 (đã sửa 2026-10-15).

### TC-SUPPORT-056 — Double-clicking Send request files one request

- **Requirement:** REQ-SUPPORT-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (double-click submit)
- **Tiền điều kiện:** stub POST trả 201 chậm 1,5 s
- **Bước:**
  1. Điền form; double-click "Send request".
- **Mong đợi:** đúng một POST `/contact/submit`; màn hình thành công hiện mã của response.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-057 — A failed submit keeps the form and says why

- **Requirement:** REQ-SUPPORT-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** stub POST trả 500
- **Bước:**
  1. Điền form; gửi.
- **Mong đợi:** `#announcer` đọc "Failed to send support request. Please try again."; tiêu đề và nội dung được giữ;
  không có màn hình thành công.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-058 — Markup in a request is shown as text, never rendered

- **Requirement:** REQ-SUPPORT-03, REQ-SUPPORT-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** bảo mật (XSS khi hiển thị)
- **Tiền điều kiện:** tài khoản mới có một yêu cầu mà tiêu đề và nội dung chứa `<img src=… onerror=…>` (gửi qua API)
- **Bước:**
  1. Đăng nhập tài khoản đó trên trình duyệt; mở `/contacts/me/<id>`.
- **Mong đợi:** trang chi tiết hiện ra; không có `<img>` nào với `src` đó và `onerror` không chạy.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`
