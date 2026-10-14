# APPS — test case

Danh mục ứng dụng của user tại `/apps`, combobox tìm kiếm trên header và danh sách danh mục công khai (REQ-APPS-01…10).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/apps.md

### TC-APPS-001 — The catalogue shows exactly the apps the user's role may open

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (role × requiredRoles × status), phân vùng tương đương (EP)
- **Tiền điều kiện:** đã đăng ký một ứng dụng fixture chỉ dành cho admin và một ứng dụng fixture không hoạt động
- **Bước:**
  1. Mở `/vi/apps`.
- **Mong đợi:** mọi ứng dụng `GET /apps` trả về đều hiện thành một card (tiêu đề h3 +
  nút "Mở <name>"); không ứng dụng fixture nào xuất hiện.
- **Automated:** `tests/e2e/apps/apps-list.e2e.ts`

### TC-APPS-002 — Open launches the app's own URL in a new tab

- **Requirement:** REQ-APPS-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** EP (mở hợp lệ)
- **Tiền điều kiện:** `window.open` đã được stub
- **Bước:**
  1. Trên `/vi/apps`, bấm "Mở <first app>".
- **Mong đợi:** `window.open` được gọi với `homeUrl` của ứng dụng.
- **Automated:** `tests/e2e/apps/apps-list.e2e.ts`

### TC-APPS-003 — English catalogue chrome at `/apps`

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/apps`.
- **Mong đợi:** tiêu đề "Apps", placeholder ô tìm kiếm "Search apps...", một nút
  "Filters" và "Open <name>" trên các card.
- **Automated:** `tests/e2e/apps/apps-list.e2e.ts`

### TC-APPS-004 — Search filters server-side, persists in the URL and clears

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** EP (khớp / đã xoá), chuyển trạng thái (đã gõ → tải lại → đã xoá)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gõ tên hiển thị của một ứng dụng vào ô tìm kiếm trên toolbar.
  2. Tải lại trang.
  3. Xoá nội dung ô.
- **Mong đợi:** một request `GET /apps?search=<name>` (đã debounce) trả về ứng dụng và
  card của nó hiện ra; `?search=` có trên URL và còn sau khi tải lại (ô giữ nguyên
  giá trị); xoá ô thì tham số mất và danh sách đầy đủ trở lại.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-005 — A search with no match shows the empty state and Clear filters

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (không khớp)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/apps?search=zzzqqq-no-such-app`.
  2. Bấm "Xóa bộ lọc".
- **Mong đợi:** hiện "Không tìm thấy ứng dụng nào."; xoá bộ lọc thì `search` biến
  khỏi URL và các card quay lại.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-006 — The category filter narrows the list and badges the Filters button

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (chọn một danh mục)
- **Tiền điều kiện:** có ít nhất một danh mục
- **Bước:**
  1. Mở "Bộ lọc", chọn danh mục thật đầu tiên.
- **Mong đợi:** request mang `categoryId`; mọi ứng dụng trả về đều thuộc danh mục
  đó; URL mang `categoryId`; nút Filters hiện "1".
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-007 — Search and category combine as an intersection

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (có search × có danh mục)
- **Tiền điều kiện:** một ứng dụng có danh mục
- **Bước:**
  1. Mở `/vi/apps?search=<prefix>&categoryId=<its category>`.
- **Mong đợi:** một request mang cả hai tham số; ứng dụng được trả về và mọi kết
  quả đều mang danh mục đó.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-008 — Grid / list toggle

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (lưới → danh sách)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Bấm "Dạng danh sách".
- **Mong đợi:** ban đầu nút lưới đang được nhấn; sau khi bấm, nút danh sách là
  `aria-pressed="true"` và nút lưới là `false`.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-009 — A single page hides the pager

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (totalPages = 1)
- **Tiền điều kiện:** `GET /apps` được stub với `totalPages: 1`
- **Bước:**
  1. Mở `/vi/apps`.
- **Mong đợi:** các item hiện ra và không có navigation `pagination` nào.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-010 — The pager walks page 1 → 2 → last, edges disabled

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (trang 1 / 2 / cuối), chuyển trạng thái
- **Tiền điều kiện:** `GET /apps` được stub với ba trang
- **Bước:**
  1. Mở `/vi/apps`; bấm trang 2, rồi trang 3.
- **Mong đợi:** ở trang 1 "Go to previous page" là `aria-disabled`; trang 2 và 3
  đưa `page=` lên URL và hiện item của trang đó; ở trang cuối "Go to next page" là
  `aria-disabled`; đã có request cho trang 1, 2, 3.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-011 — A hand-typed page beyond the last one renders safely

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (cuối + 1), đoán lỗi (error guessing)
- **Tiền điều kiện:** ít hơn 999 × 20 ứng dụng
- **Bước:**
  1. Mở `/vi/apps?page=999`.
- **Mong đợi:** trạng thái rỗng "Không tìm thấy ứng dụng nào." — không crash.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-012 — An app without icon or description uses the initial-letter fallback

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** EP (trường null)
- **Tiền điều kiện:** `GET /apps` được stub với `iconUrl: null, description: null`
- **Bước:**
  1. Mở `/vi/apps`.
- **Mong đợi:** card hiện chữ cái đầu, không có `<img>`, và không bao giờ hiện chữ
  "null".
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-013 — Skeleton cards while the catalogue loads

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (đang tải → đã tải)
- **Tiền điều kiện:** `GET /apps` bị giữ lại cho tới khi được thả
- **Bước:**
  1. Mở `/vi/apps`, rồi thả response.
- **Mong đợi:** skeleton nhấp nháy khi đang chờ; sau đó có card và không còn skeleton.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-014 — A failing catalogue request shows the error alert

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** `GET /apps` được stub trả 500
- **Bước:**
  1. Mở `/vi/apps` và chờ hết hai lần retry của React Query.
- **Mong đợi:** một `role="alert"` với nội dung "Không thể tải ứng dụng. Vui lòng thử lại."
- **Ghi chú:** spec đánh dấu `test.fail()`: **bug của app** — alert được render bên
  trong children của `PageContent`, mà children này bị thay bằng trạng thái rỗng khi
  query lỗi không có item; user thấy "No apps found" thay vì thông báo lỗi.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-015 — Opening a tile records the launch

- **Requirement:** REQ-APPS-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** EP
- **Tiền điều kiện:** `window.open` đã được stub
- **Bước:**
  1. Trên `/apps` bấm "Open <first app>".
- **Mong đợi:** `POST /users/me/recent-apps/<id>` trả 204 và `homeUrl` của ứng dụng
  đã được mở.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-016 — Open works from the keyboard

- **Requirement:** REQ-APPS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y (bàn phím)
- **Tiền điều kiện:** `window.open` đã được stub
- **Bước:**
  1. Focus vào "Mở <app>" và nhấn Enter.
- **Mong đợi:** nút nhận được focus và Enter mở `homeUrl` của ứng dụng.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-017 — A filter change is announced

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y (live region)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gõ vào ô tìm kiếm trên toolbar ở `/vi/apps`.
- **Mong đợi:** `#announcer` đọc "Đã áp dụng bộ lọc." (thông báo theo trang
  "{total} apps loaded" của thiết kế cũ không còn được nối — các key `apps.announce.*`
  không được dùng).
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-018 — Vietnamese catalogue chrome

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi), đoán lỗi (key thô)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/apps`.
- **Mong đợi:** tiêu đề "Ứng dụng", placeholder "Tìm ứng dụng...", "Bộ lọc",
  "Mở <name>"; không có key thô `apps.*` nào trong nội dung trang.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-019 — A guest is sent to the login screen

- **Requirement:** REQ-APPS-01, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** EP (không có session)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/apps` khi chưa đăng nhập.
- **Mong đợi:** URL chuyển thành `/login`; toolbar danh mục không hiện.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-020 — Header search: focus shows suggestions, typing narrows

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (đóng → gợi ý → kết quả)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Bấm vào combobox trên header; 2. gõ tên một ứng dụng.
- **Mong đợi:** listbox mở với mục "Suggested apps" và có option; sau debounce nó
  chuyển sang "Apps" và liệt kê ứng dụng đó.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-021 — A single click opens the popover and it stays open

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (hồi quy: bấm mở rồi tự đóng)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Bấm vào input, chờ, bấm lần nữa, nhấn Escape, bấm lại.
- **Mong đợi:** vẫn mở với `aria-expanded="true"` sau cả hai lần bấm; Escape đóng
  lại; lần bấm tiếp theo mở lại.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-022 — No header search for a signed-out visitor

- **Requirement:** REQ-APPS-04, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** EP (không có session)
- **Tiền điều kiện:** context sạch
- **Bước:**
  1. Mở `/`.
- **Mong đợi:** hiện lối vào đăng nhập "Continue with email" và không có combobox nào.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-023 — Header search is present on a dashboard route

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (role = user × route = dashboard)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/apps`.
- **Mong đợi:** combobox hiển thị.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-024 — Query classes: empty, whitespace, match, no-match, special characters

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (5 lớp)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở popover; lần lượt gõ rỗng / " " / tên một ứng dụng / "zzzz-no-such-app"
     / `<script>alert(1)</script>` và một emoji.
- **Mong đợi:** rỗng và khoảng trắng vẫn ở "Suggested apps"; khớp thì liệt kê ứng
  dụng; không khớp hiện "No apps found" + "Try a different keyword"; input đặc biệt
  vẫn giữ listbox hiển thị (không crash, không chạy script).
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-025 — Empty and null rows render safely

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** EP (danh mục / icon null)
- **Tiền điều kiện:** với trường hợp null, `GET /apps` được stub
- **Bước:**
  1. Tìm một từ không khớp; 2. mở popover trên một ứng dụng không có danh mục và
     không có icon.
- **Mong đợi:** chữ trạng thái rỗng đã bản địa hoá; dòng hiện ra mà không có chữ "null".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-026 — "View All" appears only when results exceed the limit

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (total = 5 so với total > 5)
- **Tiền điều kiện:** `GET /apps?search=` được stub (5 trên 5, rồi 5 trên 12)
- **Bước:**
  1. Tìm "match"; 2. tìm "many".
- **Mong đợi:** không có "View All" khi 5 trên 5; có "View All" khi 5 trên 12.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-027 — One character searches; fast typing sends one request

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (độ dài 1; cửa sổ debounce)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gõ một ký tự; 2. gõ ba ký tự cách nhau 20 ms.
- **Mong đợi:** query một ký tự vẫn kích hoạt tìm kiếm; loạt gõ nhanh chỉ gửi đúng
  một request, cho toàn bộ tiền tố.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-028 — "View All" jumps to `/apps?search=<query>`

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (kết quả → trang danh sách)
- **Tiền điều kiện:** response của query được stub với total 6
- **Bước:**
  1. Gõ tên một ứng dụng; bấm "View All".
- **Mong đợi:** điều hướng tới `/apps?search=<exact query>`.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-029 — Empty vs non-empty query switch the section label

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (query rỗng × không rỗng)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở popover, rồi gõ tên một ứng dụng.
- **Mong đợi:** đầu tiên là "Suggested apps"; sau đó là "Apps" và không còn "Suggested apps".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-030 — Rows show names, never raw ids

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (hiển thị dữ liệu)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở popover.
- **Mong đợi:** option đầu tiên có chữ và không phải một id 24 ký tự hex.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-031 — Header search chrome in English

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Trên `/` kiểm tra placeholder, mở popover, tìm một từ không khớp.
- **Mong đợi:** "Search apps...", "Suggested apps", "No apps found".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-032 — Header search chrome in Vietnamese

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi), đoán lỗi (key thô)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Làm tương tự trên `/vi`.
- **Mong đợi:** "Tìm kiếm ứng dụng...", "Ứng dụng gợi ý", "Không tìm thấy ứng
  dụng"; không có key `dashboard.header.*` nào trên trang.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-033 — Skeleton rows while a search is pending

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (đang tải → đã tải)
- **Tiền điều kiện:** `GET /apps` bị giữ lại
- **Bước:**
  1. Mở popover; thả response.
- **Mong đợi:** listbox không có option khi đang chờ, sau đó là dòng đã stub.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-034 — A failed search renders the empty state, not a spinner

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** `GET /apps` được stub trả 500
- **Bước:**
  1. Mở popover.
- **Mong đợi:** listbox hiện "No apps found".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-035 — Popover state transitions: clear, Escape, select

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (kết quả → đã xoá → gợi ý; mở → đóng; kết quả → đã chọn → đóng)
- **Tiền điều kiện:** `window.open` được stub cho trường hợp chọn
- **Bước:**
  1. Tìm không khớp rồi xoá; 2. Escape; 3. tìm một ứng dụng và bấm vào dòng của nó.
- **Mong đợi:** xoá thì quay về "Suggested apps"; Escape đóng popover và giữ focus ở
  input; chọn thì mở `homeUrl` của ứng dụng và đóng popover.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-036 — Keyboard navigation in the results

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** a11y (bàn phím), chuyển trạng thái
- **Tiền điều kiện:** `window.open` đã được stub
- **Bước:**
  1. ArrowDown, ArrowDown, ArrowUp, Enter.
- **Mong đợi:** `aria-selected` đi theo phím mũi tên; Enter mở ứng dụng đang chọn
  và đóng popover.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-037 — Combobox ARIA wiring

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y (role)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Kiểm tra input trước và sau khi mở.
- **Mong đợi:** `aria-haspopup="listbox"`, `aria-expanded` từ false → true,
  `aria-controls` bằng id của listbox.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-038 — Public categories are identical for anon, user and admin

- **Requirement:** REQ-APPS-02, REQ-APPS-05, REQ-APPS-10
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest, user, admin
- **Kỹ thuật:** bảng quyết định (người gọi × cùng payload)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /apps/categories` với tư cách ẩn danh, user và admin.
- **Mong đợi:** cả ba đều 200 với `data` giống nhau.
- **Automated:** `tests/api/apps/categories.api.ts`

### TC-APPS-039 — A bad Bearer on the public endpoint is rejected, no header is not

- **Requirement:** REQ-APPS-02, REQ-APPS-10
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** EP (không có header / token rác)
- **Tiền điều kiện:** không có
- **Bước:**
  1. GET danh mục với `Authorization` rỗng; 2. với `Bearer garbage`.
- **Mong đợi:** 200; rồi 403 (`JWT_INVALID`) — token sai không bao giờ bị hạ xuống thành ẩn danh.
- **Automated:** `tests/api/apps/categories.api.ts`

### TC-APPS-040 — Categories are cacheable for 60 s

- **Requirement:** REQ-APPS-02, REQ-APPS-10
- **Layer:** api · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** kiểm tra theo đặc tả
- **Tiền điều kiện:** không có
- **Bước:**
  1. GET danh mục.
- **Mong đợi:** `Cache-Control: public, max-age=60`.
- **Automated:** `tests/api/apps/categories.api.ts`

### TC-APPS-041 — The filter renders from SSR data and refetches once

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (dữ liệu SSR → một lần refetch phía client)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/apps`, đếm số request danh mục.
- **Mong đợi:** đúng một request phía client tới `/apps/categories`.
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-042 — The category filter label follows the locale

- **Requirement:** REQ-APPS-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (en + vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở Filters trên `/apps`, rồi trên `/vi/apps`.
- **Mong đợi:** "Filter by category", rồi "Lọc theo danh mục".
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-043 — A `categoryId` deep link pre-selects the filter

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (id hợp lệ)
- **Tiền điều kiện:** có ít nhất một danh mục
- **Bước:**
  1. Mở `/vi/apps?categoryId=<id>`.
- **Mong đợi:** request mang id đó, badge Filters hiện "1", và mọi ứng dụng trả về
  đều thuộc danh mục đó.
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-044 — A garbage `categoryId` deep link does not crash

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** EP (id không hợp lệ), đoán lỗi
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/apps?categoryId=garbage`.
- **Mong đợi:** toolbar danh mục vẫn hiện (giá trị bị bỏ ở phía client).
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-045 — Category chips use the active locale's name

- **Requirement:** REQ-APPS-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (en + vi)
- **Tiền điều kiện:** `GET /apps` được stub với một danh mục tên `{ en: "Content Stub", vi: "Nội dung giả" }`
- **Bước:**
  1. Mở `/apps`, rồi `/vi/apps`.
- **Mong đợi:** chỉ có tên tiếng Anh trên `/apps`; chỉ có tên tiếng Việt trên `/vi/apps`.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-046 — Header search results are announced

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y (live region)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tìm một từ không khớp, rồi tên một ứng dụng.
- **Mong đợi:** `#announcer` đọc "No apps found", rồi "<n> apps found".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-047 — Categories fall back to the client fetch when the server fetch fails

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi
- **Tiền điều kiện:** API không truy cập được, chỉ từ phía server Next.js
- **Bước:**
  1. Làm `getServerAppCategories()` thất bại; mở `/apps`.
- **Mong đợi:** popover Filters vẫn liệt kê danh mục sau khi request phía client
  trả về; danh mục ứng dụng không bị ảnh hưởng.
- **Automated:** manual — request lỗi chạy trong process server của Next.js trước khi
  HTML được stream, nên `page.route` không chặn được; cần khởi động client trỏ tới một
  API URL mà server không phân giải được.

### TC-APPS-050 — `GET /apps` contract

- **Requirement:** REQ-APPS-01, REQ-APPS-07
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** kiểm tra theo đặc tả
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /apps`.
- **Mong đợi:** 200, envelope `{ timestamp, path, message, data }`;
  `data.meta` page 1 / limit 20 / `totalPages = ceil(total/limit)`; mỗi item
  có `_id`, `displayName`, một `homeUrl` http(s), `isFavorite` kiểu boolean,
  `categories[]`, và không có `clientSecretHash` / `redirectUris`.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-051 — Visibility follows role × status

- **Requirement:** REQ-APPS-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user, admin
- **Kỹ thuật:** bảng quyết định (role user/admin × ứng dụng chỉ-admin/không hoạt động)
- **Tiền điều kiện:** các ứng dụng fixture
- **Bước:**
  1. Lấy danh sách với tư cách user và admin.
- **Mong đợi:** chỉ-admin: ẩn với user, hiện với admin; không hoạt động: ẩn với cả
  hai; tập của user là tập con của tập của admin.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-052 — Page boundaries

- **Requirement:** REQ-APPS-02, REQ-APPS-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (trang 0 / 1 / cuối / cuối+1), EP (`-1`, `abc`, `1.5`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Với `limit=1`: trang 1, page = total, page = total + 1; rồi các giá trị không hợp lệ.
- **Mong đợi:** trang 1 và trang cuối trả một item (khác nhau); cuối+1 trả
  `items: []` với cùng total; 0, -1, abc, 1.5 → 400 kèm `code` lỗi.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-053 — Limit boundaries

- **Requirement:** REQ-APPS-02, REQ-APPS-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (0 / 1 / 100 / 101)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /apps?limit=<n>`.
- **Mong đợi:** 0 → 400, 1 → 200 (≤ 1 item), 100 → 200, 101 → 400.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-054 — Search semantics and length

- **Requirement:** REQ-APPS-02, REQ-APPS-09
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (hoa/thường), đoán lỗi (ký tự đặc biệt của regex), giá trị biên (BVA) (200 / 201)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tìm tiền tố tên viết hoa; 2. tìm `.*`, `(`, `[a-z]+`, `\`; 3. tìm chuỗi 200 và 201 ký tự.
- **Mong đợi:** tìm thấy ứng dụng và mọi kết quả đều khớp; ký tự đặc biệt trả 200
  và `.*` không khớp gì; 200 → 200, 201 → 400.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-055 — Category filter validation

- **Requirement:** REQ-APPS-02, REQ-APPS-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** EP (id sai định dạng / không tồn tại / có thật)
- **Tiền điều kiện:** một ứng dụng có danh mục
- **Bước:**
  1. `categoryId=not-an-objectid`; 2. `ffff…ffff`; 3. một id có thật.
- **Mong đợi:** 400; trang rỗng với `total: 0, totalPages: 0`; chỉ các ứng dụng thuộc danh mục đó.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-056 — An unknown `status` param never exposes inactive apps

- **Requirement:** REQ-APPS-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (query bị sửa tay)
- **Tiền điều kiện:** ứng dụng fixture không hoạt động
- **Bước:**
  1. `GET /apps?status=inactive|INACTIVE|DISABLED`.
- **Mong đợi:** 200 và ứng dụng không hoạt động vắng mặt ở mọi lần.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-057 — The catalogue requires a valid session

- **Requirement:** REQ-APPS-01, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** EP (không token / token rác)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /apps` không có token; 2. với `Bearer garbage`.
- **Mong đợi:** 401 kèm `code` lỗi; token rác bị từ chối (401/403).
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-058 — Recording a launch

- **Requirement:** REQ-APPS-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user dùng một lần, guest
- **Kỹ thuật:** EP (id hiển thị được / chỉ-admin / không hoạt động / không tồn tại / sai định dạng)
- **Tiền điều kiện:** tài khoản dùng một lần; các ứng dụng fixture
- **Bước:**
  1. `POST /users/me/recent-apps/<id>` cho từng lớp id; 2. với tư cách guest; 3. lấy danh sách.
- **Mong đợi:** 204 / 404 / 404 / 404 / 400; guest 401; danh sách gần đây chứa
  đúng ứng dụng hiển thị được.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-059 — Category names are bilingual on every app

- **Requirement:** REQ-APPS-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** kiểm tra theo đặc tả
- **Tiền điều kiện:** một ứng dụng có danh mục
- **Bước:**
  1. Lấy danh mục ứng dụng.
- **Mong đợi:** mọi danh mục đều có `name.en` và `name.vi` không rỗng.
- **Automated:** `tests/api/apps/apps.api.ts`

## Phân quyền (ngoại lệ theo từng user)

Chạy trên tài khoản dùng một lần (role `user`); cách ghi override xem ../docs/decisions/apps.md.

### TC-APPS-060 — A revoked app leaves /apps and returns when the override is removed

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user dùng một lần (+ admin API)
- **Kỹ thuật:** chuyển trạng thái (được cấp → bị thu hồi → mặc định)
- **Tiền điều kiện:** tài khoản dùng một lần đang theo mặc định của role
- **Bước:**
  1. Mở `/apps`; thu hồi Notes; tải lại; xoá override; tải lại.
- **Mong đợi:** Notes hiện, rồi biến mất trong khi Blog vẫn còn, rồi hiện lại.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-APPS-061 — Searching for a revoked app finds nothing

- **Requirement:** REQ-APPS-06, REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user dùng một lần (+ admin API)
- **Kỹ thuật:** EP (đúng tên của một ứng dụng bị thu hồi)
- **Tiền điều kiện:** Notes đã bị thu hồi với tài khoản này
- **Bước:**
  1. Mở `/apps?search=Notes`.
- **Mong đợi:** không có card Notes.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-APPS-062 — An admin-only app granted beyond the role appears

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user dùng một lần (+ admin API)
- **Kỹ thuật:** bảng quyết định (role không có quyền × override allow)
- **Tiền điều kiện:** tài khoản dùng một lần đang theo mặc định của role
- **Bước:**
  1. Mở `/apps`; cấp Operations Console; tải lại.
- **Mong đợi:** không có card Operations Console trước khi cấp; có card sau khi cấp.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

## Bổ sung 2026-10-14

Phủ phần đã ship mà bộ cũ chưa chứng minh (xem ../docs/decisions/apps.md, Q4…Q11).

### TC-APPS-063 — Invalid catalogue queries answer VALIDATION_ERROR naming the field

- **Requirement:** REQ-APPS-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (một giá trị sai cho mỗi tham số), giá trị biên (BVA) (page 0, limit 101, search 201)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /apps` với `Accept-Language: en`, lần lượt `page=0`, `limit=101`, `search=<201 ký tự>`, `categoryId=not-an-objectid`.
- **Mong đợi:** mỗi lần 400, `code: VALIDATION_ERROR`, message "Validation failed", `errors` đúng một mục có `field`
  là tham số đó và `message` là thông điệp của nó (`validation.<field>.invalid`).
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-064 — Search ignores surrounding spaces and also matches the description

- **Requirement:** REQ-APPS-09
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (khoảng trắng đầu / cuối), phân vùng tương đương (EP) (khớp tên / khớp mô tả)
- **Tiền điều kiện:** có ít nhất một ứng dụng; phần mô tả cần một ứng dụng có từ ≥ 4 ký tự không nằm trong tên
- **Bước:**
  1. Tìm 4 ký tự đầu của tên một ứng dụng, rồi cùng chuỗi đó có khoảng trắng hai bên.
  2. Tìm một từ chỉ có trong mô tả của một ứng dụng.
- **Mong đợi:** hai lần tìm đầu trả cùng một tập và chứa ứng dụng đó; lần thứ ba chứa ứng dụng có mô tả ấy.
- **Ghi chú:** không có ứng dụng nào có từ như vậy trong mô tả thì phần 2 được ghi chú (annotation `partial`) thay vì
  bỏ cả test.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-065 — Public categories expose only id, slug and bilingual name

- **Requirement:** REQ-APPS-07, REQ-APPS-10
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** bảo mật (lộ dữ liệu), kiểm tra theo đặc tả
- **Tiền điều kiện:** có ít nhất một danh mục
- **Bước:**
  1. `GET /apps/categories` không token.
- **Mong đợi:** envelope `{ timestamp, path, message, data }`; mỗi danh mục có đúng `_id`, `slug`, `name` và `name` có
  đúng `en`, `vi` — không số ứng dụng, thứ tự hay thời điểm.
- **Automated:** `tests/api/apps/categories.api.ts`

### TC-APPS-066 — The public category list is rate-limited per IP

- **Requirement:** REQ-APPS-10
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (request thứ 100 / 101), bảo mật (giới hạn tần suất)
- **Tiền điều kiện:** counter `rate-limit:categories:ip:*` đã xoá; `keepRateLimits`
- **Bước:**
  1. Gửi 100 request `GET /apps/categories`, rồi request thứ 101 (`Accept-Language: en`).
- **Mong đợi:** 100 request đầu 200; request 101 trả 429 `TOO_MANY_REQUESTS` với message
  "Too many requests. Please try again later".
- **Automated:** `tests/api/apps/categories.api.ts`

### TC-APPS-067 — The user catalogue exposes only display fields

- **Requirement:** REQ-APPS-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảo mật (lộ dữ liệu), kiểm tra theo đặc tả
- **Tiền điều kiện:** user thấy ít nhất một ứng dụng
- **Bước:**
  1. `GET /apps?limit=100`.
- **Mong đợi:** mỗi item có đúng `_id`, `displayName`, `description`, `iconUrl`, `homeUrl`, `categories`,
  `isFavorite` — không `clientId`, `requiredRoles`, `status`, URI hay grant type.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-068 — Browser Back after a search restores the previous list

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (quay lui: đã tìm → Back)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/apps`, gõ tên một ứng dụng vào ô tìm kiếm, chờ request.
  2. Bấm Back của trình duyệt.
- **Mong đợi:** URL không còn `search`, ô tìm kiếm rỗng và danh sách đầy đủ hiện lại.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-069 — A new search from page 2 starts again at page 1

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (trang 2 → tìm kiếm), giá trị biên (BVA) (trang reset về 1)
- **Tiền điều kiện:** `GET /apps` được stub với ba trang
- **Bước:**
  1. Mở `/vi/apps`, bấm trang 2, rồi gõ "Stub".
- **Mong đợi:** URL mang `search=Stub` và `page=1`.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-070 — Enter with a query and no highlighted row opens the full list

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (Enter × có / không có dòng đang chọn), a11y (bàn phím)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Trên `/`, mở ô tìm kiếm header, gõ tên một ứng dụng, nhấn Enter (không dùng phím mũi tên).
- **Mong đợi:** điều hướng tới `/apps?search=<query>` và popover đóng.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-071 — Clicking outside closes the header search

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (mở → đóng bằng click ngoài)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Trên `/apps`, mở popover tìm kiếm, bấm vào tiêu đề trang.
- **Mong đợi:** listbox biến mất và `aria-expanded="false"`.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-072 — Header search works for an admin on an admin route

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (role = admin × route = `/admin`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin`, mở ô tìm kiếm header, gõ tên một ứng dụng trong catalogue của admin.
- **Mong đợi:** "Suggested apps" hiện khi mở; sau khi gõ có dòng của ứng dụng đó.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-073 — Opening an app from header search records the launch

- **Requirement:** REQ-APPS-03, REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (mở từ header thay vì từ ô)
- **Tiền điều kiện:** `window.open` đã được stub
- **Bước:**
  1. Trên `/`, tìm một ứng dụng trong header và bấm dòng của nó.
- **Mong đợi:** `POST /users/me/recent-apps/<id>` trả 204 và `homeUrl` của ứng dụng đã được mở.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`
