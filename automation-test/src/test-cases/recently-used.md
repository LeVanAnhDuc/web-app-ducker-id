# RECENTLYUSED — test case

Lịch sử `/recently-used`: nhóm theo ngày, số lần mở, tìm kiếm và phân trang, xoá kèm Undo, xoá toàn bộ, và bản ghi mà một lần mở app hoặc một lần đăng nhập OIDC để lại, và giới hạn tần suất ghi (REQ-RECENTLYUSED-01…07).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/recently-used.md

### TC-RECENTLYUSED-001 — Opened apps are listed under Today, newest first

- **Requirement:** REQ-RECENTLYUSED-01, REQ-RECENTLYUSED-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** happy path, chuyển trạng thái (ghi B rồi A)
- **Tiền điều kiện:** lịch sử đã xoá; hai app trong catalogue
- **Bước:**
  1. Ghi B, rồi A; mở `/recently-used`.
- **Mong đợi:** vùng "Today" liệt kê A rồi B, kèm "Opened once".
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-002 — No history shows the empty state with a catalogue link

- **Requirement:** REQ-RECENTLYUSED-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA — 0 dòng)
- **Tiền điều kiện:** lịch sử đã xoá
- **Bước:**
  1. Mở `/recently-used`; bấm "Browse apps".
- **Mong đợi:** "No recent apps yet"; nút dẫn tới `/apps`.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-003 — Search narrows the history, a miss offers to clear

- **Requirement:** REQ-RECENTLYUSED-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (khớp tiền tố / không khớp), chuyển trạng thái (đã xoá bộ lọc)
- **Tiền điều kiện:** lịch sử = [A]
- **Bước:**
  1. Tìm bằng bốn chữ cái đầu của A; 2. tìm "zzz-no-such-app"; 3. "Clear filters".
- **Mong đợi:** chỉ có A; "No results found"; A xuất hiện lại.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-004 — Remove one app, then Undo

- **Requirement:** REQ-RECENTLYUSED-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (có trong danh sách → đã xoá → đã khôi phục)
- **Tiền điều kiện:** lịch sử = [A]
- **Bước:**
  1. Bấm "Remove from history: A"; bấm "Undo" trên toast.
- **Mong đợi:** dòng biến mất ngay; Undo đưa nó trở lại và API liệt kê A.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-005 — Clear history asks first and the result survives a reload

- **Requirement:** REQ-RECENTLYUSED-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (có danh sách → xác nhận → đã xoá → reload)
- **Tiền điều kiện:** lịch sử = [A]
- **Bước:**
  1. "Clear History" → xác nhận "Clear history" trong dialog; reload.
- **Mong đợi:** dialog hiện trước; sau đó "No recent apps yet", vẫn vậy sau khi reload.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-006 — Opening an app from the catalogue lands it in the history

- **Requirement:** REQ-RECENTLYUSED-01, REQ-APPS-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái giữa các trang
- **Tiền điều kiện:** lịch sử đã xoá; tab mới được đóng ngay khi mở
- **Bước:**
  1. Bấm "Open A" trên `/apps`; mở `/recently-used`.
- **Mong đợi:** `POST /users/me/recent-apps/<id>` → 204; A có trong danh sách.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-007 — The heart on a row toggles the favourite

- **Requirement:** REQ-FAVORITES-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (bật/tắt hai lần)
- **Tiền điều kiện:** lịch sử = [A]
- **Bước:**
  1. Bấm hình trái tim của dòng hai lần.
- **Mong đợi:** `aria-pressed` đổi giá trị, rồi trở về giá trị ban đầu.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-008 — Infinite scroll loads the next page and says when it ends

- **Requirement:** REQ-RECENTLYUSED-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA — trang 1 → trang cuối)
- **Tiền điều kiện:** danh sách bị stub: hai trang, mỗi trang một dòng
- **Bước:**
  1. Mở `/recently-used` và để sentinel / Load more tải trang 2.
- **Mong đợi:** cả hai dòng đều render; "You've reached the end of your history."
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-009 — Vietnamese page

- **Requirement:** REQ-RECENTLYUSED-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (vi)
- **Tiền điều kiện:** lịch sử = [A]
- **Bước:**
  1. Mở `/vi/recently-used`.
- **Mong đợi:** h1 "Dùng gần đây" và một vùng "Hôm nay".
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-010 — Day groups switch exactly at local midnight

- **Requirement:** REQ-RECENTLYUSED-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA — hai phía của mỗi ranh giới Today / Yesterday / This Week / Earlier)
- **Tiền điều kiện:** đồng hồ cố định lúc 07.10.2026 10:00 (UTC+7); danh sách bị stub
- **Bước:**
  1. Trả các dòng dùng lúc 07.10 00:00:00, 06.10 23:59:59, 06.10 00:00:00,
     05.10 23:59:59, 01.10 00:00:00, 30.09 23:59:59; mở trang.
- **Mong đợi:** Today = 1; Yesterday = 2, 3; This Week = 4, 5; Earlier = 6.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-011 — A row shows its last-opened time and open count

- **Requirement:** REQ-RECENTLYUSED-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (số lần 1 / nhiều), quy tắc số nhiều
- **Tiền điều kiện:** danh sách bị stub (useCount 3, mở 2 giờ trước; useCount 1)
- **Bước:**
  1. Mở `/recently-used`.
- **Mong đợi:** "Opened 3 times" và thời gian mở lần cuối dạng tương đối "… ago";
  "Opened once" ở dòng còn lại.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-012 — Cancelling the clear dialog keeps the history

- **Requirement:** REQ-RECENTLYUSED-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (dialog xác nhận → huỷ)
- **Tiền điều kiện:** lịch sử = [A]
- **Bước:**
  1. "Clear History" → "Cancel".
- **Mong đợi:** dialog ("Clear your recent history?") đóng lại, A vẫn có trong
  danh sách và vẫn có trong API.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-013 — A failing history request shows an error, not the empty state

- **Requirement:** REQ-RECENTLYUSED-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — 5xx)
- **Tiền điều kiện:** danh sách bị stub trả 500
- **Bước:**
  1. Mở `/recently-used`.
- **Mong đợi:** một alert "Could not load your recent apps."; không có "No recent apps yet".
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-020 — List contract: one row per app, newest first

- **Requirement:** REQ-RECENTLYUSED-01, REQ-RECENTLYUSED-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user dùng một lần
- **Kỹ thuật:** kiểm theo đặc tả, chuyển trạng thái (A, B, A)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. Ghi A, B, A; lấy danh sách.
- **Mong đợi:** mỗi lần 204; items `[A, B]`; meta total 2 / page 1 / 1 trang;
  mỗi dòng có `lastUsedAt` hợp lệ, `useCount ≥ 1`, `isFavorite` kiểu boolean.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-021 — The dedupe window counts one open per minute

- **Requirement:** REQ-RECENTLYUSED-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** giá trị biên (BVA — 59 s / 61 s kể từ lần mở trước)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. Ghi hai lần liền nhau; lùi dòng 59 s rồi ghi; lùi 61 s rồi ghi.
- **Mong đợi:** `useCount` 1, 1, 2.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-022 — Hide, restore, clear and re-record

- **Requirement:** REQ-RECENTLYUSED-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user dùng một lần
- **Kỹ thuật:** chuyển trạng thái (hiện → ẩn → khôi phục → xoá hết → ghi lại)
- **Tiền điều kiện:** đã ghi A (số lần 2) và B
- **Bước:**
  1. DELETE A; POST A/restore; DELETE all; ghi A.
- **Mong đợi:** danh sách `[B]`; A quay lại với số lần 2; rỗng với `total 0,
totalPages 0`; `[A]` với số lần 1.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-023 — Page and limit boundaries

- **Requirement:** REQ-RECENTLYUSED-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** giá trị biên (BVA — page 1 / cuối / cuối+1, limit 0 / 100 / 101, search 200 / 201), phân vùng tương đương (`abc`)
- **Tiền điều kiện:** đã ghi ba app
- **Bước:**
  1. `limit=1` các trang 1, 3, 4; rồi các giá trị biên và không hợp lệ.
- **Mong đợi:** một dòng ở trang 1 và 3 (khác app), `[]` ở trang 4; page 0 / abc,
  limit 0 / 101, search 201 ký tự → 400; limit 100, search 200 ký tự → 200.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-024 — Search over the history

- **Requirement:** REQ-RECENTLYUSED-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** phân vùng tương đương (khớp / không khớp)
- **Tiền điều kiện:** đã ghi A và B
- **Bước:**
  1. `search=<A's name>`; `search=zzz-no-such-app`.
- **Mong đợi:** A có trong kết quả và `total` bằng số dòng trả về; `[]` với total 0.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-025 — Id validation

- **Requirement:** REQ-RECENTLYUSED-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** phân vùng tương đương (id sai định dạng / không tồn tại)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. Ghi / ẩn / khôi phục `not-an-id`; ghi `ffff…ffff`.
- **Mong đợi:** 400 ba lần; 404 kèm `code` lỗi.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-026 — Every endpoint requires a session

- **Requirement:** REQ-RECENTLYUSED-01, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (không có token)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi list, stats, record, hide, restore và clear không kèm token.
- **Mong đợi:** mỗi lời gọi đều 401.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-027 — History is private to each user

- **Requirement:** REQ-RECENTLYUSED-01, REQ-RECENTLYUSED-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** hai user dùng một lần
- **Kỹ thuật:** đoán lỗi (Error Guessing — IDOR giữa các tài khoản)
- **Tiền điều kiện:** Alice đã ghi A, Bob đã ghi B
- **Bước:**
  1. So sánh danh sách; Bob ẩn A và xoá lịch sử của mình.
- **Mong đợi:** mỗi người chỉ thấy app của mình; sau đó Alice vẫn còn A.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-028 — Signing in to a satellite app records it as used

- **Requirement:** REQ-RECENTLYUSED-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user dùng một lần có session IdP
- **Kỹ thuật:** chuyển trạng thái (chưa có lịch sử → authorize → đã ghi)
- **Tiền điều kiện:** một OAuth client public do spec đăng ký
- **Bước:**
  1. Chạy `/oauth/authorize` (PKCE) trên session tới khi code được cấp; lấy danh sách.
- **Mong đợi:** lịch sử trở thành đúng `[client app]` với `useCount` 1.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-029 — A revoked app drops out of the history and returns on re-grant

- **Requirement:** REQ-RECENTLYUSED-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user dùng một lần (+ admin API)
- **Kỹ thuật:** chuyển trạng thái (đã dùng → bị thu hồi → khôi phục)
- **Tiền điều kiện:** tài khoản dùng một lần đã ghi một lần mở Notes
- **Bước:**
  1. Thu hồi Notes; đọc `GET /users/me/recent-apps` và `/recently-used`; gỡ override.
- **Mong đợi:** Notes vắng mặt ở danh sách API và trên trang trong lúc bị thu hồi;
  quay lại ở cả hai sau đó.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-RECENTLYUSED-030 — Opening an app from its row records another launch

- **Requirement:** REQ-RECENTLYUSED-01, REQ-RECENTLYUSED-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (dòng cũ → mở lại → lên đầu)
- **Tiền điều kiện:** lịch sử = [B, A] (B mới nhất); tab mới được đóng ngay khi mở
- **Bước:**
  1. Bấm "Open A" trên dòng của A; reload.
- **Mong đợi:** `POST /users/me/recent-apps/<A>` → 204; thứ tự thành A rồi B.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-031 — Clear History is disabled while there is nothing to clear

- **Requirement:** REQ-RECENTLYUSED-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA — 0 dòng), trạng thái nút
- **Tiền điều kiện:** lịch sử đã xoá
- **Bước:**
  1. Mở `/recently-used`.
- **Mong đợi:** "No recent apps yet"; nút "Clear History" bị vô hiệu (Q5).
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-032 — A search in the URL opens the history already filtered

- **Requirement:** REQ-RECENTLYUSED-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (nhảy cóc — vào thẳng URL có `?search=`)
- **Tiền điều kiện:** lịch sử = [A]
- **Bước:**
  1. Mở `/recently-used?search=zzz-no-such-app`; 2. "Clear filters".
- **Mong đợi:** ô tìm kiếm chứa sẵn `zzz-no-such-app`, "No results found", A không hiện; sau khi xoá bộ lọc chỉ có A (Q8).
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-033 — Each day group shows how many apps it holds

- **Requirement:** REQ-RECENTLYUSED-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (1 / nhiều — quy tắc số nhiều)
- **Tiền điều kiện:** đồng hồ cố định lúc 07.10.2026 10:00 (UTC+7); danh sách bị stub: 1 dòng hôm nay, 2 dòng hôm qua
- **Bước:**
  1. Mở `/recently-used`.
- **Mong đợi:** nhóm "Today" mang badge "1 app", nhóm "Yesterday" mang "2 apps".
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-034 — Removing and clearing confirm with a toast

- **Requirement:** REQ-RECENTLYUSED-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (xoá một → xoá hết), thông báo
- **Tiền điều kiện:** lịch sử = [B, A]
- **Bước:**
  1. Bấm "Remove from history: A"; 2. "Clear History" → xác nhận.
- **Mong đợi:** toast "A removed from history"; rồi toast "Recent history cleared" (Q6).
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENTLYUSED-035 — Hide and restore can be repeated safely

- **Requirement:** REQ-RECENTLYUSED-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** đoán lỗi (gọi lặp / double submit), phân vùng tương đương (app đã mở / chưa từng mở)
- **Tiền điều kiện:** đã ghi A; B chưa từng mở
- **Bước:**
  1. Ẩn A hai lần; khôi phục A hai lần; 2. ẩn rồi khôi phục B.
- **Mong đợi:** mọi lời gọi 204; danh sách `[]` sau khi ẩn, `[A]` sau khi khôi phục; B không tạo dòng nào (Q3).
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-036 — Search ignores surrounding spaces and letter case

- **Requirement:** REQ-RECENTLYUSED-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** đoán lỗi (khoảng trắng, viết HOA / thường)
- **Tiền điều kiện:** đã ghi A
- **Bước:**
  1. `search` = tên A có khoảng trắng hai đầu; tên A viết HOA; tên A viết thường.
- **Mong đợi:** mỗi lần trả đúng `[A]` (Q4).
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENTLYUSED-037 — Recording is rate-limited per user

- **Requirement:** REQ-RECENTLYUSED-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** hai user dùng một lần
- **Kỹ thuật:** giá trị biên (BVA — lần 60 / 61 trong một phút), bảo mật (lạm dụng)
- **Tiền điều kiện:** hai tài khoản mới; giữ bộ đếm rate limit (`keepRateLimits`)
- **Bước:**
  1. Alice ghi cùng một app 60 lần; 2. lần thứ 61; 3. Bob ghi app đó.
- **Mong đợi:** 60 lần đầu 204; lần 61 → 429 `TOO_MANY_REQUESTS` kèm "Too many requests. Please try again later";
  Bob vẫn 204 (Q2).
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`
