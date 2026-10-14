# NOTIFICATIONS — test case

Chuông trên header (badge chưa đọc + panel), trang `/notifications` với tab All / Unread / Read và bộ lọc loại, mở và đánh dấu thông báo đã đọc, cùng các sự kiện thật sinh ra thông báo.
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/notifications.md

Case ghi "thông báo đã seed" đọc hộp thư của `user@test.com` sau khi spec xoá các dòng không phải seed mà spec khác sinh
ra trong lượt (Q6).

### TC-NOTIFICATIONS-001 — All tab by default, seeded templates, grouped, relative times

- **Requirement:** REQ-NOTIFICATIONS-02, REQ-NOTIFICATIONS-05, REQ-NOTIFICATIONS-07
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** happy path
- **Tiền điều kiện:** thông báo đã seed
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** tab "All" đang chọn; "Seed App 10 is now in your launcher." (chưa đọc)
  và câu của Seed App 11 (đã đọc) đều có trong danh sách; có header Today / Yesterday / Earlier;
  không có timestamp ISO.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-002 — A guest is gated to the login screen

- **Requirement:** REQ-NOTIFICATIONS-02, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (không có session)
- **Tiền điều kiện:** context sạch
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** hiện "Continue with email"; không có tab "All".
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-003 — Empty state

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (0 mục)
- **Tiền điều kiện:** stub danh sách rỗng
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** "You're all caught up" và "No notifications here."
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-004 — Load more appends page 2 and disappears on the last page

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (trang 1 → trang cuối)
- **Tiền điều kiện:** stub danh sách: 20 + 5 mục
- **Bước:**
  1. Bấm "Load more notifications".
- **Mong đợi:** các mục trang 2 xuất hiện, nút biến mất và `#announcer` đọc
  "Loading more notifications...".
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-005 — Unread rows can be marked; read rows cannot

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (isRead false / true)
- **Tiền điều kiện:** stub một dòng chưa đọc và một dòng đã đọc
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** một `article[data-read=false]`, một `article[data-read=true]`,
  đúng một nút "Mark as read".
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-006 — Each template is filled from its params

- **Requirement:** REQ-NOTIFICATIONS-07, REQ-NOTIFICATIONS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (type × params: lý do anomaly là device, actor admin / self, số phút khoá)
- **Tiền điều kiện:** thông báo đã seed
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** "New sign-in to your account" kèm "Chrome on Windows — a device
  we haven't seen on your account before."; "Your password was reset by an
  administrator" và "Your password was changed"; "Too many wrong passwords.
  Sign-in was blocked for 30 minutes."; không có enum thô hay key `types.`.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-007 — English chrome

- **Requirement:** REQ-NOTIFICATIONS-02, REQ-NOTIFICATIONS-03, REQ-NOTIFICATIONS-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** các tab "All" / "Unread" / "Read", "Mark all as read" và nhóm chip
  "Filter by type".
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-008 — Vietnamese chrome and templates

- **Requirement:** REQ-NOTIFICATIONS-07, REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** thông báo đã seed
- **Bước:**
  1. Mở `/vi/notifications`.
- **Mong đợi:** "Tất cả" / "Chưa đọc" / "Đã đọc", "Đánh dấu tất cả đã đọc",
  "Seed App 10 đã có trong launcher của bạn." và "Có lượt đăng nhập mới vào
  tài khoản"; không còn template tiếng Anh.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-009 — A failing list shows the error state and Try again recovers

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (lỗi → thử lại → đã tải)
- **Tiền điều kiện:** stub danh sách trả 500, sau đó trả một dòng
- **Bước:**
  1. Mở `/notifications`; gỡ lỗi; bấm "Try again".
- **Mong đợi:** "Couldn't load notifications.", sau đó hiện dòng.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-010 — Marking one read moves it out of Unread and lowers the count

- **Requirement:** REQ-NOTIFICATIONS-03, REQ-NOTIFICATIONS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (chưa đọc → đã đọc)
- **Tiền điều kiện:** Seed App 12 đã seed ở trạng thái chưa đọc; khôi phục trong afterAll
- **Bước:**
  1. Mở tab Unread; bấm "Mark as read" trên dòng Seed App 12.
- **Mong đợi:** số chưa đọc từ API giảm đúng 1 và dòng rời khỏi tab Unread.
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-011 — Mark all empties the Unread tab

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (2 chưa đọc → 0)
- **Tiền điều kiện:** stub danh sách, unread-count và read-all
- **Bước:**
  1. Bấm "Mark all as read".
- **Mong đợi:** hiện trạng thái rỗng, các mục biến mất và chuông không còn badge.
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-012 — Mark all with nothing unread is a no-op

- **Requirement:** REQ-NOTIFICATIONS-03, REQ-NOTIFICATIONS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (0 chưa đọc)
- **Tiền điều kiện:** stub với 0 chưa đọc, `updated: 0`
- **Bước:**
  1. Bấm "Mark all as read".
- **Mong đợi:** vẫn rỗng; chuông không có badge số (không bao giờ âm).
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-013 — A double click sends one PATCH

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (chặn khi pending), đoán lỗi (submit hai lần)
- **Tiền điều kiện:** stub một mục chưa đọc; PATCH trễ 600 ms
- **Bước:**
  1. Bấm; trong lúc nút bị disable thì phát thêm một cú bấm.
- **Mong đợi:** nút bị disable khi đang pending và chỉ đúng một PATCH được gửi.
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-014 — A marked notification stays read after reload

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (đã đọc → reload)
- **Tiền điều kiện:** Seed App 14 đã seed ở trạng thái chưa đọc; khôi phục trong afterAll
- **Bước:**
  1. Đánh dấu dòng Seed App 14; reload; mở Unread, rồi Read.
- **Mong đợi:** dòng chuyển sang `data-read=true`; sau reload không còn ở Unread; có ở Read.
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-015 — The bell shows the unread badge and the panel asks for 8 rows

- **Requirement:** REQ-NOTIFICATIONS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (giới hạn panel 8)
- **Tiền điều kiện:** stub unread-count = 3; stub danh sách
- **Bước:**
  1. Ở `/` đọc chuông; mở nó.
- **Mong đợi:** badge "3"; panel liệt kê các mục, có "Mark all as read",
  và request danh sách của nó mang `limit=8`.
- **Automated:** `tests/e2e/notifications/header-panel.e2e.ts`

### TC-NOTIFICATIONS-016 — No badge at zero unread; the panel shows its empty state

- **Requirement:** REQ-NOTIFICATIONS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (count 0)
- **Tiền điều kiện:** stub unread-count = 0; stub danh sách rỗng
- **Bước:**
  1. Ở `/` mở chuông.
- **Mong đợi:** không có badge số; panel hiện "You're all caught up".
- **Automated:** `tests/e2e/notifications/header-panel.e2e.ts`

### TC-NOTIFICATIONS-017 — Per-tab empty state on Read

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (phân vùng rỗng)
- **Tiền điều kiện:** stub danh sách rỗng chỉ cho `isRead=true`
- **Bước:**
  1. Chuyển sang Read.
- **Mong đợi:** "No notifications here." trên tab Read đang chọn.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-018 — An unknown type renders its name instead of crashing

- **Requirement:** REQ-NOTIFICATIONS-07
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (type client không biết; `readAt: null`)
- **Tiền điều kiện:** stub một dòng type `FUTURE_TYPE`
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** hiện "FUTURE_TYPE" và không phát sinh page error.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-019 — Exactly one full page shows no Load more

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (20 mục, totalPages 1)
- **Tiền điều kiện:** stub danh sách
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** không có "Load more notifications".
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-020 — The Read tab holds only read rows

- **Requirement:** REQ-NOTIFICATIONS-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (tab × isRead)
- **Tiền điều kiện:** đã seed Seed App 10 (chưa đọc) và 11 (đã đọc)
- **Bước:**
  1. Chuyển sang Read.
- **Mong đợi:** hiện câu của Seed App 11, không có Seed App 10;
  `#announcer` đọc "Showing Read notifications.".
- **Automated:** `tests/e2e/notifications/filters.e2e.ts`

### TC-NOTIFICATIONS-021 — Vietnamese relative times

- **Requirement:** REQ-NOTIFICATIONS-07, REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi), đoán lỗi (lọt locale)
- **Tiền điều kiện:** thông báo đã seed
- **Bước:**
  1. Mở `/vi/notifications`.
- **Mong đợi:** timestamp chứa "trước"; không có chữ "ago" tiếng Anh và không có template tiếng Anh.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-022 — A failed mark-read gets its own toast and leaves the item unread

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (5xx khi mutation)
- **Tiền điều kiện:** stub một mục chưa đọc; stub PATCH trả 500
- **Bước:**
  1. Bấm "Mark as read".
- **Mong đợi:** toast "Could not mark as read." và **không** phải toast chung
  "Server error. Please try again later."; mục và nút của nó vẫn còn.
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-023 — Tab, type filter and Load more are announced

- **Requirement:** REQ-NOTIFICATIONS-02, REQ-NOTIFICATIONS-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y (live region)
- **Tiền điều kiện:** stub danh sách hai trang (20 + 5)
- **Bước:**
  1. Chuyển sang Read; chọn chip Security; bấm Load more.
- **Mong đợi:** `#announcer` đọc "Showing Read notifications.", "Showing
  Security notifications.", "Loading more notifications...".
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-024 — Enter and Space activate Mark as read

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y (bàn phím)
- **Tiền điều kiện:** stub một mục chưa đọc
- **Bước:**
  1. Focus vào nút; nhấn Enter (và, riêng lần khác, Space).
- **Mong đợi:** PATCH được gửi.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-025 — Each row is an article named by its title; its link takes focus

- **Requirement:** REQ-NOTIFICATIONS-02, REQ-NOTIFICATIONS-06
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y
- **Tiền điều kiện:** stub một dòng APP_AVAILABLE
- **Bước:**
  1. Tìm article theo tên; focus vào link của nó.
- **Mong đợi:** có `article` "New app available"; link nhận được focus.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-026 — Skeleton while loading, gone once loaded

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (đang tải → đã tải), đoán lỗi (skeleton bị bỏ sót lại)
- **Tiền điều kiện:** giữ request danh sách, sau đó thả ra
- **Bước:**
  1. Mở `/notifications`; thả request.
- **Mong đợi:** skeleton aria-hidden khi đang pending; sau đó hiện các mục và không
  còn sót thanh tiêu đề skeleton.
- **Automated:** `tests/e2e/notifications/loading-state.e2e.ts`

### TC-NOTIFICATIONS-027 — Day groups switch at local midnight

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (hai phía của mỗi ranh giới Today / Yesterday / Earlier)
- **Tiền điều kiện:** cố định đồng hồ 07.10.2026 10:00 (UTC+7); stub danh sách
- **Bước:**
  1. Trả về các mục lúc 07.10 00:00:00, 06.10 23:59:59, 06.10 00:00:00, 05.10 23:59:59.
- **Mong đợi:** Today 1, Yesterday 2, Earlier 1.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-028 — The panel's Mark all and View all

- **Requirement:** REQ-NOTIFICATIONS-01, REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (2 chưa đọc → 0; panel → trang)
- **Tiền điều kiện:** stub các endpoint (count 2 → 0 sau read-all)
- **Bước:**
  1. Ở `/` mở chuông; "Mark all as read"; "View all notifications".
- **Mong đợi:** badge biến mất; điều hướng tới `/notifications`.
- **Automated:** `tests/e2e/notifications/header-panel.e2e.ts`

### TC-NOTIFICATIONS-030 — List contract and sort order

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway user
- **Kỹ thuật:** kiểm tra đặc tả, phân vùng tương đương (sortOrder asc / mặc định)
- **Tiền điều kiện:** ba dòng đã seed (một dòng đã đọc)
- **Bước:**
  1. GET danh sách; GET với `sortOrder=asc`.
- **Mong đợi:** mặc định mới nhất trước, với asc thì cũ nhất trước; meta total 3,
  1 trang; id khớp; mỗi mục có `type` / `category` / `params` và không có
  `title`, `message` hay `dedupeKey`; `readAt` chỉ có trên dòng đã đọc.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-031 — Read filter and unread count agree

- **Requirement:** REQ-NOTIFICATIONS-01, REQ-NOTIFICATIONS-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** phân vùng tương đương (isRead true / false)
- **Tiền điều kiện:** hai dòng chưa đọc, một dòng đã đọc
- **Bước:**
  1. `isRead=false`, `isRead=true`, `/unread-count`.
- **Mong đợi:** total lần lượt 2 và 1 với trạng thái khớp; count 2.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-032 — Paging boundaries and query validation

- **Requirement:** REQ-NOTIFICATIONS-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** giá trị biên (BVA) (21 dòng với limit 20; trang 3; limit 0 / 1 / 100 / 101), phân vùng tương đương (`abc`, `maybe`, `sideways`, category `bogus`)
- **Tiền điều kiện:** 21 dòng
- **Bước:**
  1. Trang 1–3; từng giá trị không hợp lệ.
- **Mong đợi:** 20 + 1 + 0 dòng, totalPages 2; giá trị không hợp lệ trả 400, limit 1 / 100 → 200.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-033 — Marking one read is idempotent

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway user
- **Kỹ thuật:** chuyển trạng thái (chưa đọc → đã đọc → đã đọc)
- **Tiền điều kiện:** hai dòng chưa đọc
- **Bước:**
  1. PATCH một dòng hai lần.
- **Mong đợi:** 200 với `isRead: true` và có `readAt`; count 2 → 1 và giữ nguyên 1.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-034 — Mark all read

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** giá trị biên (BVA) (2 chưa đọc → 0 chưa đọc)
- **Tiền điều kiện:** hai dòng chưa đọc, một dòng đã đọc
- **Bước:**
  1. PATCH `/read-all` hai lần.
- **Mong đợi:** `{ updated: 2 }`, count 0; sau đó `{ updated: 0 }`.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-035 — Notifications are private to each user

- **Requirement:** REQ-NOTIFICATIONS-09, REQ-NOTIFICATIONS-02, REQ-NOTIFICATIONS-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** hai throwaway user
- **Kỹ thuật:** đoán lỗi (IDOR)
- **Tiền điều kiện:** mỗi người một dòng chưa đọc
- **Bước:**
  1. Bob xem danh sách, PATCH id của Alice, và đánh dấu tất cả.
- **Mong đợi:** Bob chỉ thấy dòng của mình; id của Alice trả 404 với Bob; dòng của Alice vẫn chưa đọc.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-036 — Id validation

- **Requirement:** REQ-NOTIFICATIONS-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (id sai định dạng / không tồn tại)
- **Tiền điều kiện:** không có
- **Bước:**
  1. PATCH `not-an-id/read` và `ffff…/read`.
- **Mong đợi:** 400; 404 kèm `code` lỗi.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-037 — Every endpoint requires a session

- **Requirement:** REQ-NOTIFICATIONS-09, REQ-NOTIFICATIONS-01, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (không token)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi list, unread-count, read-all và mark-one không kèm token.
- **Mong đợi:** mỗi cái trả 401.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-038 — The type filter narrows the list and combines with isRead

- **Requirement:** REQ-NOTIFICATIONS-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** phân vùng tương đương (`security` / `app` / `system` / không hợp lệ), bảng quyết định (category × isRead)
- **Tiền điều kiện:** hai dòng APP_AVAILABLE (một đã đọc), một LOGIN_ANOMALY, một ACCOUNT_LOCKED đã đọc
- **Bước:**
  1. Lấy danh sách với `category=security`, `app`, `system`; `security` + `isRead=false`; `bogus`, `SECURITY`, rỗng.
- **Mong đợi:** 2 dòng security, 2 dòng app, không có gì cho system, chỉ
  LOGIN_ANOMALY khi kết hợp; mỗi giá trị không hợp lệ trả 400.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-039 — A new device and country names the country

- **Requirement:** REQ-NOTIFICATIONS-07
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (lý do anomaly `both`)
- **Tiền điều kiện:** stub một LOGIN_ANOMALY `{ reason: both, browser: Firefox, os: Linux, country: JP }`
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** "Firefox on Linux, from Japan — a device and a country we haven't seen before."
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-040 — A link that is not an internal path renders no anchor

- **Requirement:** REQ-NOTIFICATIONS-06
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (URL tuyệt đối, protocol-relative `//host`, backslash `/\host`, `javascript:`)
- **Tiền điều kiện:** stub một dòng cho mỗi link
- **Bước:**
  1. Mở `/notifications` cho từng trường hợp.
- **Mong đợi:** chữ của dòng vẫn hiện và dòng không chứa `<a>` nào.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-041 — An internal link renders an anchor to that path

- **Requirement:** REQ-NOTIFICATIONS-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (đường dẫn nội bộ)
- **Tiền điều kiện:** stub một dòng APP_AVAILABLE với `/apps?search=…`
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** link của dòng có `href="/apps?search=Intercepted%20app%201"`.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-042 — Tab and type chip combine into one request

- **Requirement:** REQ-NOTIFICATIONS-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (tab × category)
- **Tiền điều kiện:** stub danh sách; ghi lại các request
- **Bước:**
  1. Mở `/notifications`; chọn Unread, rồi chip Security.
- **Mong đợi:** request đầu tiên không có `isRead` lẫn `category`; một request
  sau đó có `isRead=false&category=security`; chip ở trạng thái pressed.
- **Automated:** `tests/e2e/notifications/filters.e2e.ts`

### TC-NOTIFICATIONS-043 — The Security and Apps chips filter the real list

- **Requirement:** REQ-NOTIFICATIONS-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (security / app)
- **Tiền điều kiện:** thông báo đã seed
- **Bước:**
  1. Chọn Security; rồi Apps.
- **Mong đợi:** Security hiện "New sign-in to your account" và không có dòng Seed App
  nào; Apps hiện Seed App 10 và không có dòng đăng nhập nào.
- **Automated:** `tests/e2e/notifications/filters.e2e.ts`

### TC-NOTIFICATIONS-044 — Country names follow the reader's language

- **Requirement:** REQ-NOTIFICATIONS-07
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi), bảng quyết định (lý do `country`)
- **Tiền điều kiện:** stub một LOGIN_ANOMALY với `country: VN`
- **Bước:**
  1. Mở `/vi/notifications`.
- **Mong đợi:** câu nêu tên "Việt Nam", không phải "VN".
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-045 — Opening an unread row marks it read and follows its link

- **Requirement:** REQ-NOTIFICATIONS-06, REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (chưa đọc → đã mở)
- **Tiền điều kiện:** stub một dòng APP_AVAILABLE chưa đọc; stub PATCH
- **Bước:**
  1. Bấm vào dòng.
- **Mong đợi:** điều hướng tới `/apps?search=Intercepted app 7` và PATCH mark-read được gửi.
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-046 — Opening a read row does not mark it again

- **Requirement:** REQ-NOTIFICATIONS-06
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (chuyển không hợp lệ đã đọc → đã đọc)
- **Tiền điều kiện:** stub một dòng đã đọc; đếm số PATCH
- **Bước:**
  1. Bấm vào dòng.
- **Mong đợi:** điều hướng tới `/apps?search=…` và không có PATCH.
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-047 — "Not you?" on an unusual sign-in leads to the password form

- **Requirement:** REQ-NOTIFICATIONS-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** happy path
- **Tiền điều kiện:** stub một dòng LOGIN_ANOMALY
- **Bước:**
  1. Bấm "Not you? Change your password".
- **Mong đợi:** điều hướng tới `/profile`.
- **Automated:** `tests/e2e/notifications/mark-read.e2e.ts`

### TC-NOTIFICATIONS-048 — A sign-in from an unseen device produces a real notification

- **Requirement:** REQ-NOTIFICATIONS-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway user
- **Kỹ thuật:** chuyển trạng thái (thiết bị đã biết → thiết bị mới)
- **Tiền điều kiện:** một tài khoản throwaway
- **Bước:**
  1. Đăng nhập qua API với vai trình duyệt A (Safari trên macOS — lần đăng nhập đầu: chưa có lịch sử), rồi với vai trình duyệt B (Firefox trên Linux).
  2. Đăng nhập trên trình duyệt và mở `/notifications`.
- **Mong đợi:** không có LOGIN_ANOMALY sau lần đăng nhập đầu; đúng một cái sau
  lần thứ hai, với `params.browser` là "Firefox"; trang hiện "Firefox on …".
- **Automated:** `tests/e2e/notifications/sign-in-alert.e2e.ts`

### TC-NOTIFICATIONS-049 — The panel shows its error state

- **Requirement:** REQ-NOTIFICATIONS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** stub danh sách trả 500
- **Bước:**
  1. Ở `/` mở chuông.
- **Mong đợi:** panel hiện "Couldn't load notifications.".
- **Automated:** `tests/e2e/notifications/header-panel.e2e.ts`

### TC-NOTIFICATIONS-050 — Opening an item in the panel closes it and navigates

- **Requirement:** REQ-NOTIFICATIONS-01, REQ-NOTIFICATIONS-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (panel mở → đóng)
- **Tiền điều kiện:** stub một dòng đã đọc
- **Bước:**
  1. Ở `/` mở chuông; bấm vào dòng.
- **Mong đợi:** điều hướng tới `/apps?search=…` và không còn dialog nào.
- **Automated:** `tests/e2e/notifications/header-panel.e2e.ts`

### TC-NOTIFICATIONS-051 — Type chips expose their pressed state

- **Requirement:** REQ-NOTIFICATIONS-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** a11y
- **Tiền điều kiện:** stub danh sách
- **Bước:**
  1. Đọc nhóm "Filter by type".
- **Mong đợi:** "All types" ở trạng thái pressed, "Security" không pressed.
- **Automated:** `tests/e2e/notifications/inbox.e2e.ts`

### TC-NOTIFICATIONS-052 — The badge refreshes on its own every minute

- **Requirement:** REQ-NOTIFICATIONS-08
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (count đổi phía server)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Để một trang mở trong khi có thông báo mới đến.
- **Mong đợi:** badge cập nhật trong vòng 60 s mà không cần reload.
- **Automated:** manual — chu kỳ là `refetchInterval: 60_000` trong `useUnreadCount`; chứng minh nó nghĩa là mỗi lần chạy phải chờ một phút (hoặc giả lập timer bên trong React Query), điều suite không làm. Đã kiểm bằng cách đọc hook.

### TC-NOTIFICATIONS-053 — Changing your own password notifies you

- **Requirement:** REQ-NOTIFICATIONS-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** chuyển trạng thái (sự kiện → dòng được lưu)
- **Tiền điều kiện:** một tài khoản throwaway
- **Bước:**
  1. `PATCH /auth/change-password`.
- **Mong đợi:** một dòng PASSWORD_CHANGED, category `security`, `params.actor`
  `self`, link `/profile`, chưa đọc.
- **Automated:** `tests/api/notifications/events.api.ts`

### TC-NOTIFICATIONS-054 — An admin password reset notifies the user

- **Requirement:** REQ-NOTIFICATIONS-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin + throwaway user
- **Kỹ thuật:** chuyển trạng thái (sự kiện → dòng được lưu)
- **Tiền điều kiện:** một tài khoản throwaway
- **Bước:**
  1. `POST /admin/users/:id/reset-password`.
- **Mong đợi:** một dòng PASSWORD_CHANGED với `params.actor` `admin` và link `/profile`.
- **Automated:** `tests/api/notifications/events.api.ts`

### TC-NOTIFICATIONS-055 — A password lockout notifies the account

- **Requirement:** REQ-NOTIFICATIONS-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** giá trị biên (BVA) (lần sai mật khẩu thứ 10)
- **Tiền điều kiện:** một tài khoản throwaway
- **Bước:**
  1. Nhập sai mật khẩu 10 lần.
- **Mong đợi:** một dòng ACCOUNT_LOCKED, category `security`, link
  `/login-history`, `params.minutes` là một số dương.
- **Automated:** `tests/api/notifications/events.api.ts`

### TC-NOTIFICATIONS-056 — A new app in the launcher is announced once

- **Requirement:** REQ-NOTIFICATIONS-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (ẩn → active → inactive → active)
- **Tiền điều kiện:** một app chưa từng được thông báo cho ai
- **Bước:**
  1. Tạo app ở trạng thái inactive, kích hoạt, tắt, rồi kích hoạt lại.
- **Mong đợi:** mỗi user mà role của app cho phép nhận **đúng một** dòng APP_AVAILABLE.
- **Automated:** manual — thông báo là một broadcast tới mọi tài khoản đủ điều kiện, nên tự động hoá sẽ ghi một dòng vào hộp thư của `user@test.com` / `admin@test.com` đã seed mà các spec khác bám vào. Đã kiểm bằng tay với API thật ngày 05.10.2026 (`docs/specs/notification-events/design.md` §9) và bằng unit test của web-app.

### TC-NOTIFICATIONS-057 — The account filter returns access changes only

- **Requirement:** REQ-NOTIFICATIONS-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway user
- **Kỹ thuật:** phân vùng tương đương (`account`), bảng quyết định (category × isRead)
- **Tiền điều kiện:** một ENTITLEMENT_GRANTED chưa đọc, một ENTITLEMENT_REVOKED đã đọc, một APP_AVAILABLE, một ACCOUNT_LOCKED
- **Bước:**
  1. Lấy danh sách với `category=account`; rồi `category=account` + `isRead=false`.
- **Mong đợi:** đúng 2 dòng, đều category `account` và type ENTITLEMENT\_\*; khi kết hợp chỉ còn ENTITLEMENT_GRANTED.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-058 — Another user's id is answered exactly like an unknown id

- **Requirement:** REQ-NOTIFICATIONS-09, REQ-NOTIFICATIONS-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** hai throwaway user
- **Kỹ thuật:** bảo mật (dò id / enumeration), đoán lỗi (IDOR)
- **Tiền điều kiện:** Alice có một dòng chưa đọc
- **Bước:**
  1. Bob PATCH `/:id/read` với id của Alice; rồi với `ffff…` (không tồn tại).
- **Mong đợi:** cả hai trả 404 với cùng `code` `NOTIFICATION_NOT_FOUND` và cùng message "Notification not found" — không
  phân biệt được id có tồn tại hay không.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-059 — List items never expose their owner

- **Requirement:** REQ-NOTIFICATIONS-09, REQ-NOTIFICATIONS-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** throwaway user
- **Kỹ thuật:** kiểm tra đặc tả, bảo mật (lộ dữ liệu nội bộ)
- **Tiền điều kiện:** một dòng chưa đọc, một dòng đã đọc
- **Bước:**
  1. GET danh sách.
- **Mong đợi:** mỗi mục có đúng các trường `id`, `type`, `category`, `params`, `link`, `isRead`, `readAt`, `createdAt` —
  không có `userId`, `_id`, `__v` hay `dedupeKey`.
- **Automated:** `tests/api/notifications/inbox.api.ts`

### TC-NOTIFICATIONS-060 — The panel's Unread tab asks for unread rows only

- **Requirement:** REQ-NOTIFICATIONS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (tab All → Unread của panel), bảng quyết định (tab × isRead)
- **Tiền điều kiện:** stub danh sách: một dòng chưa đọc, một dòng đã đọc; ghi lại các request
- **Bước:**
  1. Ở `/` mở chuông; bấm "Unread" trong panel.
- **Mong đợi:** "All" pressed lúc mở và hiện cả dòng đã đọc; sau khi bấm, "Unread" pressed, có request `isRead=false&limit=8`,
  dòng đã đọc biến mất.
- **Automated:** `tests/e2e/notifications/header-panel.e2e.ts`

### TC-NOTIFICATIONS-061 — The panel's Mark all is disabled with nothing unread

- **Requirement:** REQ-NOTIFICATIONS-01, REQ-NOTIFICATIONS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (count 0)
- **Tiền điều kiện:** stub unread-count = 0; stub một dòng đã đọc
- **Bước:**
  1. Ở `/` mở chuông.
- **Mong đợi:** "Mark all as read" của panel bị disable; không có request `read-all`.
- **Automated:** `tests/e2e/notifications/header-panel.e2e.ts`
