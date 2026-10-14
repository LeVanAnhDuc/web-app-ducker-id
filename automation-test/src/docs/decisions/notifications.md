# NOTIFICATIONS — quyết định

## Nguồn

Đọc ngày 2026-10-10.

- `client/src/views/Notifications/**`
- `client/src/components/Notification*`
- `client/src/hooks/useNotificationText.ts`
- `client/src/utils/notifications.ts`
- `client/src/layouts/AppHeader/components/NotificationPanel*`
- `client/src/locales/{en,vi}/notifications.json` (template `types.<TYPE>`)
- `server/src/modules/notification/**`
- `server/src/services/notification/`
- `server/src/validators/schemas/notification.ts`
- `server/src/database/seeders/data/notifications.ts`

Đọc lại ngày 2026-10-14 khi chuẩn hóa: `README.md` `## Features` (Notifications inbox),
`docs/specs/notifications-api/design.md` (§ endpoint, "Authorization invariant", 404 `NOTIFICATION_NOT_FOUND`),
`docs/specs/notification-events/design.md`, `client/src/layouts/AppHeader/**`, `client/src/locales/{en,vi}/dashboard.json`
(`header.notificationsLabel`, `notifications.*` của panel), `server/src/modules/notification/dtos/`,
`server/src/i18n/locales/en/notification.json`.

Chuyển đổi từ `docs/specs/notifications-api/e2e.md`, phần tải thông báo trong
`docs/specs/frontend-cleanup/e2e.md` và `docs/specs/notification-events/e2e.md`
(kịch bản 1–13 và §3 "not in E2E").

## Quyết định chốt

Q1–Q5: phân định rút ra từ header cũ của file test case:

- **Q1** Phạm vi module: chuông trên header (badge chưa đọc + panel), trang `/notifications` với tab All / Unread / Read
  và bộ lọc loại, mở và đánh dấu đã đọc, cùng các sự kiện thật sinh ra thông báo (REQ-NOTIFICATIONS-01…08).
- **Q2** Thông báo đổi quyền truy cập thuộc REQ-ADMINENTITLEMENTS-04 (`admin-entitlements.md`, TC-ADMINENTITLEMENTS-040 / 041),
  không thuộc module này.
- **Q3** Vì một dòng chỉ lưu `type + category + params + link`, không bao giờ lưu text, các case assert trên câu đã render
  ("Seed App 10 is now in your launcher.") chứ không assert trên dữ liệu thô.
- **Q4** Những trạng thái seed không tạo được (rỗng, hai trang, lỗi, type không biết, link không an toàn, quốc gia khác)
  được dựng bằng cách stub endpoint với `page.route`.
- **Q5** Case kiểm producer và API dùng tài khoản throwaway (`insertNotifications` ghi dòng theo đúng shape thật).
- **Q6** (tự quyết 2026-10-14, cần user duyệt): case đọc hộp thư seed của `user@test.com` đỏ trong lượt chạy đầy đủ vì
  spec khác (admin-apps broadcast APP_AVAILABLE, entitlement, cảnh báo đăng nhập) sinh thêm dòng mới hơn, đẩy "Seed App N"
  khỏi trang 1 (20 dòng) — làm sao cho test độc lập với số thông báo spec khác sinh ra? → `beforeAll` của mọi spec đọc seed
  gọi `prepareSeededInbox()`: đăng nhập một lần bằng User-Agent helper (chờ dòng lịch sử đăng nhập, và LOGIN_ANOMALY nếu có,
  được ghi), rồi xoá mọi dòng của `user@test.com` không khớp hình dạng seed (`removeNonSeedNotifications`). Kỳ vọng không
  đổi; không spec nào khác đọc lại các dòng đó → REQ-NOTIFICATIONS-02, 03, 05, 07.
- **Q7** (tự quyết 2026-10-14, cần user duyệt): quyền riêng tư của thông báo chỉ có trong code và
  `docs/specs/notifications-api/design.md` ("Authorization invariant", 404 cho id không thuộc người gọi), chưa có REQ riêng →
  thêm REQ-NOTIFICATIONS-09 theo design doc (docs > code); TC-035 / 037 gắn thêm REQ này, thêm TC-058 (id người khác trả
  y như id không tồn tại) và TC-059 (mục không lộ chủ sở hữu) → REQ-NOTIFICATIONS-09.
- **Q8** (tự quyết 2026-10-14, cần user duyệt): bộ lọc `account` (ENTITLEMENT\_\*) chưa có case nào, `system` thì có → thêm
  TC-057 ở tầng API; panel trên header có tab All / Unread và nút Mark all bị disable khi 0 chưa đọc (code) nhưng chưa có
  case → thêm TC-060, TC-061; link `javascript:` là một phân vùng nữa của TC-040 → REQ-NOTIFICATIONS-01, 05, 06.
- **Q9** (tự quyết 2026-10-14, cần user duyệt): TC-048 ghi trình duyệt B là "Safari" nhưng test (đã xanh) đăng nhập trước bằng
  Safari rồi mới bằng Firefox → sửa mô tả TC cho khớp test (A = Safari trên macOS, B = Firefox trên Linux); kỳ vọng của test
  không đổi → REQ-NOTIFICATIONS-04.
- **Q10** (tự quyết 2026-10-14, cần user duyệt): TC-023 (thông báo cho trình đọc màn hình) trước đây được chứng minh bằng
  assertion nằm rải trong test của TC-004 / 020 / 042, nên không test nào mang được tên của nó → viết một test riêng
  (stub hai trang: Read → chip Security → Load more); assertion cũ vẫn giữ trong ba test kia. TC-008 / 021 tách thành hai
  test, mỗi test một TC → REQ-NOTIFICATIONS-02, 05, 07.

## Tài khoản test

- Một dòng lưu `type + category + params + link`, không bao giờ lưu text: client render `notifications.types.<TYPE>` theo
  locale của trang.
- Case trên trình duyệt chạy bằng `user@test.com` với 26 dòng đã seed của nó — #10 (chưa đọc) và #11 (đã đọc) là mốc chỉ
  đọc; #12 và #14 bị tiêu bởi hai case `PATCH /:id/read` thật và được đưa về chưa đọc trong `afterAll`
  (`markUnreadByAppName`; không có API mark-unread). Trước khi đọc, spec xoá các dòng không phải seed (Q6). Mốc nằm ở
  `SEED_NOTIFICATIONS` (`data/test-data.ts`), truy cập DB ở `utils/notifications.ts`.
- Case producer và API dùng tài khoản throwaway (`insertNotifications` ghi dòng theo shape thật); project cleanup xoá chúng.

## Dữ kiện server

Các case dựa vào: mặc định mới nhất trước (`sortOrder` asc / desc), 20 mỗi trang, `limit` 1…100, `page` ≥ 1, `isRead`
boolean, `category` là một trong `security` / `account` / `app` / `system`. `PATCH /:id/read` giới hạn trong phạm vi người
gọi (id của user khác là 404, không phải 403) và idempotent; `PATCH /read-all` trả `{ updated }`. Panel xin 8 dòng. Client
nhóm theo ngày local (Today / Yesterday / Earlier), chỉ hiện badge số khi lớn hơn 0, refetch count mỗi 60 s, chỉ render
link cho đường dẫn nội bộ, và toast thông điệp riêng "Could not mark as read." khi đánh dấu thất bại (toast 5xx chung bị
chặn).

## Ngoài phạm vi

- Phần §3 "not in E2E" của `docs/specs/notification-events/e2e.md` (xem các TC manual).
- TC-NOTIFICATIONS-052: badge tự làm mới mỗi phút — không tự động hoá vì phải chờ một phút mỗi lần chạy; kiểm bằng đọc hook.
- TC-NOTIFICATIONS-056: thông báo app mới — không tự động hoá vì broadcast sẽ ghi vào hộp thư của tài khoản seed dùng
  chung; kiểm bằng tay ngày 05.10.2026 và bằng unit test.

## Tech debt liên quan

- Locator skeleton (`[aria-hidden='true'] .w-40`, TC-026) bám class Tailwind của `NotificationListSkeleton` vì markup không
  có role / test id nào khác — giữ nguyên khi chuẩn hóa.
- Không có API mark-unread, nên dòng seed bị tiêu phải khôi phục trực tiếp trong DB (`markUnreadByAppName`).
