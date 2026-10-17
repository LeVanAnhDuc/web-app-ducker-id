# HOME — test case

Dashboard launcher tại `/`: lời chào, "Jump back in", biểu đồ hoạt động đăng nhập, phân tách theo phương thức / thiết bị, bảng xếp hạng app dùng nhiều nhất và các link đi sâu của chúng.
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/home.md

### TC-HOME-001 — The four stat cards are links carrying their value

- **Requirement:** REQ-HOME-05, REQ-HOME-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** happy path
- **Tiền điều kiện:** stats bị stub (3 app đã dùng, 3 active, 5 thành công, 2 thất bại)
- **Bước:**
  1. Mở `/vi`.
- **Mong đợi:** các link "Ứng dụng đã dùng: 3", "Hoạt động 30 ngày: 3",
  "Đăng nhập thành công: 5", "Đăng nhập thất bại: 2".
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-002 — The browser timezone is sent so days are cut locally

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** kiểm theo đặc tả
- **Tiền điều kiện:** timezone trình duyệt là Asia/Ho_Chi_Minh
- **Bước:**
  1. Mở `/vi`; đọc request stats.
- **Mong đợi:** `tz` là `Asia/Ho_Chi_Minh` hoặc `Asia/Saigon`.
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-003 — The chart has a screen-reader summary and a data table

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng tiếp cận (a11y)
- **Tiền điều kiện:** stats bị stub
- **Bước:**
  1. Mở `/vi`.
- **Mong đợi:** một `img` tên "Hoạt động đăng nhập 7 ngày qua…" và một bảng
  "Số lượt đăng nhập theo ngày".
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-004 — One row per day, including days without sign-ins

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, 7 bucket, sáu trong số đó bằng 0)
- **Tiền điều kiện:** stats 7 ngày có đúng một ngày khác 0
- **Bước:**
  1. Mở `/vi`.
- **Mong đợi:** bảng theo ngày có 7 dòng thân bảng.
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-005 — The range toggle is kept in the URL

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (7d → 30d → tải lại), giá trị biên (BVA, 30)
- **Tiền điều kiện:** stats 30 ngày bị stub
- **Bước:**
  1. Bấm "30 ngày"; tải lại trang.
- **Mong đợi:** `range=30d` trong URL; sau khi tải lại "30 ngày" là
  `aria-pressed="true"` và bảng có 30 dòng.
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-006 — An unsupported range falls back to 7 days

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP, giá trị không hợp lệ)
- **Tiền điều kiện:** stats bị stub
- **Bước:**
  1. Mở `/vi?range=999d`.
- **Mong đợi:** "7 ngày" được chọn và bảng có 7 dòng.
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-007 — An empty period is explained

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, 0 lần đăng nhập)
- **Tiền điều kiện:** stats không có lần đăng nhập nào
- **Bước:**
  1. Mở `/vi`.
- **Mong đợi:** "Chưa ghi nhận lần đăng nhập nào trong khoảng này."
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-008 — A sparse period is explained up to the threshold

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, 3 = ngưỡng, 4 = vượt một)
- **Tiền điều kiện:** stats có 3, rồi 4 lần đăng nhập
- **Bước:**
  1. Mở `/vi`; stub lại với 4 và tải lại.
- **Mong đợi:** "Chỉ có 3 lần đăng nhập…" khi là 3; gợi ý theo ngày
  "Chọn một ngày để xem các lượt đăng nhập của ngày đó." khi là 4.
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-009 — An empty ranking invites the user to open an app

- **Requirement:** REQ-HOME-06
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, 0 app)
- **Tiền điều kiện:** stats app không có top app nào
- **Bước:**
  1. Mở `/vi`.
- **Mong đợi:** "Mở một ứng dụng, nó sẽ được xếp hạng ở đây."
- **Automated:** `tests/e2e/home/app-sections.e2e.ts`

### TC-HOME-010 — A stat card opens the matching filtered list

- **Requirement:** REQ-HOME-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (Home → danh sách)
- **Tiền điều kiện:** stats bị stub
- **Bước:**
  1. Bấm "Đăng nhập thất bại: 2".
- **Mong đợi:** URL `/login-history?status=failed`.
- **Automated:** `tests/e2e/home/drill-down.e2e.ts`

### TC-HOME-011 — A method slice opens the list filtered by method

- **Requirement:** REQ-HOME-04, REQ-HOME-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái, đoán lỗi (nhãn, không phải enum thô)
- **Tiền điều kiện:** stats bị stub
- **Bước:**
  1. Bấm link "Mật khẩu".
- **Mong đợi:** URL `/login-history?method=password`.
- **Automated:** `tests/e2e/home/drill-down.e2e.ts`

### TC-HOME-012 — A device row filters the list and the filter is applied

- **Requirement:** REQ-HOME-04, REQ-HOME-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái, đoán lỗi (query param bị rơi mất)
- **Tiền điều kiện:** stats bị stub (1 lần đăng nhập từ mobile)
- **Bước:**
  1. Bấm "Di động: 1".
- **Mong đợi:** URL `/login-history?deviceType=MOBILE` và badge của nút Filters
  ghi 1.
- **Automated:** `tests/e2e/home/drill-down.e2e.ts`

### TC-HOME-013 — A failing stats endpoint degrades one card only

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** stats đăng nhập bị stub thành 500
- **Bước:**
  1. Mở `/vi` và chờ hết các lần retry.
- **Mong đợi:** "Không tải được hoạt động đăng nhập."; mục "Ứng dụng dùng
  nhiều nhất" vẫn render.
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-014 — "Jump back in" falls back to the catalogue for a new user

- **Requirement:** REQ-HOME-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, 0 recent app)
- **Tiền điều kiện:** recent app bị stub rỗng
- **Bước:**
  1. Mở `/vi`.
- **Mong đợi:** "Bạn chưa mở ứng dụng nào — đây là những gì đang có." và
  mục đó vẫn chứa các ô app.
- **Automated:** `tests/e2e/home/app-sections.e2e.ts`

### TC-HOME-015 — The explore call-to-action counts the real catalogue

- **Requirement:** REQ-HOME-05, REQ-HOME-09
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (số bị hard-code)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi`; đọc `meta.total` từ response catalogue.
- **Mong đợi:** "Hiện có <total> ứng dụng — tìm cái tiếp theo bạn cần."
- **Automated:** `tests/e2e/home/app-sections.e2e.ts`

### TC-HOME-016 — Home in English

- **Requirement:** REQ-HOME-03, REQ-HOME-04, REQ-HOME-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (en)
- **Tiền điều kiện:** stats bị stub
- **Bước:**
  1. Mở `/`.
- **Mong đợi:** heading "Sign-in activity", "Most used apps", "Explore"; link
  "Failed sign-ins: 2"; nút "7 days".
- **Automated:** `tests/e2e/home/i18n.e2e.ts`

### TC-HOME-017 — The removed vanity metrics stay gone

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (hồi quy)
- **Tiền điều kiện:** stats bị stub
- **Bước:**
  1. Mở `/vi` và `/`.
- **Mong đợi:** không có "Thời gian tiết kiệm", "Time Saved" hay "Current Streak".
- **Automated:** `tests/e2e/home/i18n.e2e.ts`

### TC-HOME-018 — A guest is sent to the login screen

- **Requirement:** REQ-AUTHZ-01, REQ-HOME-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP, không có session)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi`.
- **Mong đợi:** URL chuyển thành `/login`.
- **Automated:** `tests/e2e/home/access.e2e.ts`

### TC-HOME-019 — The greeting follows the local hour

- **Requirement:** REQ-HOME-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, 00:00, 11:59 / 12:00, 17:59 / 18:00, 23:59), i18n (vi + en)
- **Tiền điều kiện:** đồng hồ trình duyệt cố định ở từng mốc giờ (UTC+7); stats bị stub
- **Bước:**
  1. Mở `/vi` ở từng mốc giờ; mở `/` lúc 09:00.
- **Mong đợi:** h1 bắt đầu bằng "Chào buổi sáng" lúc 00:00 và 11:59, "Chào buổi
  chiều" lúc 12:00 và 17:59, "Chào buổi tối" lúc 18:00 và 23:59; bản tiếng Anh
  là "Good morning" theo sau là họ tên đầy đủ của user.
- **Automated:** `tests/e2e/home/greeting.e2e.ts`

### TC-HOME-020 — "Jump back in" shows the apps the user opened last

- **Requirement:** REQ-HOME-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP, có lịch sử), thứ tự
- **Tiền điều kiện:** recent app bị stub với hai app, mới nhất trước
- **Bước:**
  1. Mở `/vi`.
- **Mong đợi:** phụ đề "Quay lại nơi bạn vừa rời đi"; các ô "Recent Stub 1",
  "Recent Stub 2" theo đúng thứ tự đó; không có chữ của nhánh dự phòng catalogue.
- **Automated:** `tests/e2e/home/app-sections.e2e.ts`

### TC-HOME-021 — "Most used apps" ranks by lifetime opens and links to the history

- **Requirement:** REQ-HOME-06, REQ-HOME-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP, ba app được xếp hạng)
- **Tiền điều kiện:** stats app bị stub (9 / 5 / 2 lần mở)
- **Bước:**
  1. Mở `/vi`; bấm dòng đầu tiên.
- **Mong đợi:** ba dòng theo đúng thứ tự đã cho kèm số lần; dòng đó
  điều hướng tới `/recently-used`.
- **Automated:** `tests/e2e/home/app-sections.e2e.ts`

### TC-HOME-022 — The 90-day range keeps one row per day

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, khoảng lớn nhất)
- **Tiền điều kiện:** stats 90 ngày bị stub
- **Bước:**
  1. Mở `/vi?range=90d`.
- **Mong đợi:** "90 ngày" được chọn; bảng 90 dòng.
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-023 — A day link includes every sign-in of that local day

- **Requirement:** REQ-HOME-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, lần đăng nhập lúc 00:00 và 23:59 giờ địa phương)
- **Tiền điều kiện:** các dòng login history được ghi tương đối theo ngày chạy
- **Bước:**
  1. Bấm một cột biểu đồ; so danh sách với các dòng của ngày đó.
- **Mong đợi:** mọi lần đăng nhập của ngày địa phương đó, kể cả các lần lúc tối muộn.
- **Automated:** manual — cần các dòng `login_histories` có ngày tương đối theo
  lượt chạy, thứ seed không ghi; bản thân filter đã được phủ bởi
  `server/src/modules/login-history/helpers/login-history-filter.spec.ts`.

### TC-HOME-030 — Sign-in stats: one bucket per day, totals that add up

- **Requirement:** REQ-HOME-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, 7 / 30 / 90 ngày), kiểm theo đặc tả
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /login-history/stats?range=<r>&tz=Asia/Ho_Chi_Minh` cho từng range.
- **Mong đợi:** `byDay` có đúng `days` bucket liên tiếp, bucket đầu là
  ngày địa phương của `range.from`, bucket cuối là hôm nay (địa phương); `successful +
failed = total`; tổng các bucket bằng `total`.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-031 — Range and timezone validation

- **Requirement:** REQ-HOME-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP, range và zone hợp lệ / không hợp lệ), giá trị biên (BVA, 6d / 8d / 91d, tz 65 ký tự)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Không có range; `1d`, `6d`, `8d`, `91d`, `999d`, `7`, `week`; tz dạng canonical,
     link, UTC, Europe/Paris; `Mars/Olympus`, `not a zone`, 65 ký tự.
- **Mong đợi:** mặc định 7 ngày; mọi range không hợp lệ 400; zone hợp lệ 200; zone không hợp lệ 400.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-032 — Method and device breakdowns are complete and consistent

- **Requirement:** REQ-HOME-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** kiểm theo đặc tả
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /login-history/stats?range=30d`.
- **Mong đợi:** key của `byMethod` = password, otp, magic-link, forgot-password,
  sso; key của `byDevice` = DESKTOP, MOBILE, TABLET, UNKNOWN; mỗi nhóm cộng lại bằng
  `total`; `0 ≤ anomalies ≤ total`.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-033 — The ranking orders by opens and honours `limit`

- **Requirement:** REQ-HOME-06
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user tạm
- **Kỹ thuật:** giá trị biên (BVA, limit 0 / 1 / 10 / 11), phân vùng tương đương (EP, `abc`)
- **Tiền điều kiện:** ba app được mở 3, 2 và 1 lần (vượt quá cửa sổ dedupe)
- **Bước:**
  1. `GET /users/me/recent-apps/stats`, rồi với từng limit.
- **Mong đợi:** `totalApps` 3, active 7 / 30 ngày là 3; `topApps` = a (3), b (2),
  c (1); limit 1 → 1 dòng, 10 → 3 dòng; 0, 11, abc → 400.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-034 — A new account has an empty ranking

- **Requirement:** REQ-HOME-06
- **Layer:** api · **Priority:** P2 · **Vai trò:** user tạm
- **Kỹ thuật:** giá trị biên (BVA, không có lịch sử)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. `GET /users/me/recent-apps/stats`.
- **Mong đợi:** mọi số đếm bằng 0 và `topApps: []`.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-035 — Both stats endpoints require a session

- **Requirement:** REQ-HOME-03, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP, không có token)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi cả hai endpoint không có token.
- **Mong đợi:** mỗi endpoint trả 401.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-036 — Stats count only the caller's own data

- **Requirement:** REQ-HOME-03, REQ-HOME-06
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user tạm, user
- **Kỹ thuật:** đoán lỗi (rò dữ liệu giữa các tài khoản)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. So `total` 7 ngày của nó với tổng login-history của chính nó; đọc bảng xếp hạng của nó.
- **Mong đợi:** hai tổng bằng nhau (≥ 1), các lần đăng nhập của user seed không
  bị tính vào, và bảng xếp hạng rỗng.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-037 — The stat cards follow the range and name the window they count

- **Requirement:** REQ-HOME-07, REQ-HOME-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (7d → 30d), phân vùng tương đương (EP, thẻ theo khoảng / thẻ trọn đời)
- **Tiền điều kiện:** stats bị stub theo `range` (7d: 5 / 2, 30d: 11 / 4)
- **Bước:**
  1. Mở `/vi`; bấm "30 ngày".
- **Mong đợi:** trước khi đổi: "Đăng nhập thành công: 5" ghi "7 ngày qua"; sau khi đổi: "Đăng nhập thành công: 11" và
  "Đăng nhập thất bại: 4", cả hai ghi "30 ngày qua"; phụ đề "30 ngày qua · Asia/Ho_Chi_Minh"; "Ứng dụng đã dùng" vẫn
  ghi "Từ trước tới nay" và "Hoạt động 30 ngày" ghi "Ứng dụng bạn còn mở".
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-038 — The failed sign-ins card counts unusual sign-ins

- **Requirement:** REQ-HOME-07
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, `anomalies` 0 / 1)
- **Tiền điều kiện:** stats bị stub với `anomalies` 0, rồi 1
- **Bước:**
  1. Mở `/vi`; stub lại với 1 bất thường và tải lại.
- **Mong đợi:** khi 0: thẻ thất bại ghi "7 ngày qua"; khi 1: "7 ngày qua · 1 bất thường".
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-039 — Every stat card opens its own list

- **Requirement:** REQ-HOME-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (Home → danh sách), phân vùng tương đương (EP, mỗi thẻ một đích)
- **Tiền điều kiện:** stats bị stub
- **Bước:**
  1. Lần lượt bấm "Ứng dụng đã dùng: 3", "Hoạt động 30 ngày: 3", "Đăng nhập thành công: 5" (mỗi lần mở lại `/vi`).
- **Mong đợi:** `/recently-used`, `/recently-used`, `/login-history?status=success` (thẻ thất bại: TC-HOME-010).
- **Automated:** `tests/e2e/home/drill-down.e2e.ts`

### TC-HOME-040 — Each section links to its full list

- **Requirement:** REQ-HOME-05, REQ-HOME-09
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (link chết / đích sai)
- **Tiền điều kiện:** stats bị stub
- **Bước:**
  1. Mở `/vi`; đọc `href` của link cuối mỗi khối; bấm CTA "Xem tất cả ứng dụng".
- **Mong đợi:** "Xem lịch sử" → `/login-history`; "Xem tất cả" của "Ứng dụng dùng nhiều nhất" và của "Dùng gần đây" →
  `/recently-used`; "Xem tất cả ứng dụng" của "Khám phá" và của CTA → `/apps`; bấm CTA tới `/apps`.
- **Automated:** `tests/e2e/home/drill-down.e2e.ts`

### TC-HOME-041 — A breakdown leaves out empty slices and explains an empty one

- **Requirement:** REQ-HOME-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, nhóm bằng 0; mọi nhóm bằng 0)
- **Tiền điều kiện:** stats chỉ có 5 lần đăng nhập bằng mật khẩu từ máy tính, rồi 0 lần
- **Bước:**
  1. Mở `/vi`; stub lại với 0 lần và tải lại.
- **Mong đợi:** khi 5: phân tách phương thức có đúng 1 link ("Mật khẩu"), thiết bị đúng 1 dòng ("Máy tính: 5"); khi 0:
  cả hai khối ghi "Chưa có dữ liệu để phân tích."
- **Automated:** `tests/e2e/home/activity.e2e.ts`

### TC-HOME-042 — A failing recent-apps endpoint degrades "Jump back in" only

- **Requirement:** REQ-HOME-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (5xx)
- **Tiền điều kiện:** `GET /users/me/recent-apps` bị stub thành 500
- **Bước:**
  1. Mở `/vi` và chờ hết các lần retry.
- **Mong đợi:** "Không tải được ứng dụng dùng gần đây." trong khối "Dùng gần đây"; các heading "Hoạt động đăng nhập",
  "Ứng dụng dùng nhiều nhất", "Khám phá" vẫn render.
- **Automated:** `tests/e2e/home/app-sections.e2e.ts`

### TC-HOME-043 — Opening a "Jump back in" tile launches the app and records it

- **Requirement:** REQ-HOME-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (Home → app), kiểm theo đặc tả (mọi nút mở app đều ghi lượt mở)
- **Tiền điều kiện:** recent app bị stub với một app; `window.open` được ghi lại; `POST` ghi lượt mở được stub 204
  (app giả, không ghi gì cho user seed)
- **Bước:**
  1. Mở `/vi`; bấm ô "Recent Stub 1".
- **Mong đợi:** `window.open` được gọi với home URL của app; một `POST /users/me/recent-apps/<id>` được gửi.
- **Automated:** `tests/e2e/home/app-sections.e2e.ts`

### TC-HOME-044 — The greeting subtitle counts the apps the user has used

- **Requirement:** REQ-HOME-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, `totalApps` 1 / 0)
- **Tiền điều kiện:** stats app bị stub với 1, rồi 0 app
- **Bước:**
  1. Mở `/vi`; stub lại với 0 và tải lại.
- **Mong đợi:** "Bạn đang có 1 ứng dụng trong bộ sưu tập." rồi "Mở một ứng dụng bất kỳ, nó sẽ xuất hiện ở đây."
- **Automated:** `tests/e2e/home/greeting.e2e.ts`

### TC-HOME-045 — Going back from a drill-down keeps the chosen range

- **Requirement:** REQ-HOME-03, REQ-HOME-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (quay lui: danh sách → Home)
- **Tiền điều kiện:** stats bị stub theo `range`
- **Bước:**
  1. Mở `/vi?range=30d`; bấm "Đăng nhập thất bại: 2"; bấm Back của trình duyệt.
- **Mong đợi:** về lại Home với `range=30d` trong URL, "30 ngày" `aria-pressed="true"` và bảng 30 dòng.
- **Automated:** `tests/e2e/home/drill-down.e2e.ts`

### TC-HOME-046 — Invalid stats queries are refused with a translated validation error

- **Requirement:** REQ-HOME-03, REQ-HOME-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP, range / tz / limit sai), i18n (en theo `Accept-Language`, vi mặc định)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `range=8d`, `tz=Mars/Olympus` trên `/login-history/stats`; `limit=11`, `limit=abc` trên
     `/users/me/recent-apps/stats`; mỗi request một lần với `Accept-Language: en`, một lần không header.
- **Mong đợi:** 400 `VALIDATION_ERROR`; `errors` có mục `{ field, message }` đúng trường, message là
  `validation.range.invalid` / `timezone.invalid` / `limit.invalid` của catalogue server theo ngôn ngữ (en / vi).
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-047 — An over-long timezone is refused with the translated message only

- **Requirement:** REQ-HOME-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA, `tz` 65 ký tự), đoán lỗi (message chưa dịch)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /login-history/stats?tz=<65 ký tự>` với `Accept-Language: en`.
- **Mong đợi:** 400 `VALIDATION_ERROR`; mọi mục `errors` là `{ field: "tz", message: "Invalid timezone." }` — không có
  câu Joi thô. (Từng là BUG-HOME-01, đã sửa 2026-10-15.)
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-048 — The ranking leaves out apps removed from the history or no longer allowed

- **Requirement:** REQ-HOME-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** user tạm, admin (qua API, đặt override)
- **Kỹ thuật:** chuyển trạng thái (đã mở → xoá khỏi lịch sử; có quyền → bị thu hồi)
- **Tiền điều kiện:** tài khoản mới mở ba app a, b, c
- **Bước:**
  1. Xoá b khỏi lịch sử (`DELETE /users/me/recent-apps/:b`); đọc stats.
  2. Admin đặt override thu hồi c cho tài khoản đó; đọc stats; dọn override.
- **Mong đợi:** bước 1: `totalApps` 2, `activeLast30Days` 2, `topApps` = a, c; bước 2: `totalApps` 1, `topApps` = a.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-049 — The ranking defaults to five apps

- **Requirement:** REQ-HOME-06
- **Layer:** api · **Priority:** P2 · **Vai trò:** user tạm
- **Kỹ thuật:** giá trị biên (BVA, mặc định 5, mở 6 app)
- **Tiền điều kiện:** tài khoản mới mở tối đa 6 app của catalogue (xem Q7 trong decisions)
- **Bước:**
  1. `GET /users/me/recent-apps/stats` không có `limit`.
- **Mong đợi:** `totalApps` = số app đã mở; `topApps` có `min(5, số app đã mở)` dòng.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-050 — A user id in the query cannot widen the stats to another account

- **Requirement:** REQ-HOME-03, REQ-HOME-06
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user tạm, user
- **Kỹ thuật:** bảo mật (IDOR qua tham số lạ)
- **Tiền điều kiện:** tài khoản mới; `_id` và auth id của user seed
- **Bước:**
  1. Gọi cả hai endpoint stats của tài khoản mới với `userId=<id của user seed>` (cả hai dạng id).
- **Mong đợi:** 200; `total` đăng nhập bằng tổng login-history của chính tài khoản mới; bảng xếp hạng rỗng.
- **Automated:** `tests/api/home/stats.api.ts`
