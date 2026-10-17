# ADMINAPPS — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- Client: `client/src/views/AdminApps/**`, `client/src/dataSources/AdminApps`, `client/src/forms/AdminApp` (rule zod),
  câu chữ trong `client/src/locales/{en,vi}/adminApps.json` và `list.json`.
- Server: `server/src/modules/web-app/**`, rule Joi trong `server/src/validators/schemas/web-app.ts`, rule redirect URI
  trong `isValidRedirectUri` (`server/src/modules/oauth/helpers`).

Chuyển đổi từ `docs/specs/edit-apps/e2e.md` (12 dòng rubric), `docs/specs/list-table-column-controls/e2e.md`, phần
admin-app của `docs/specs/frontend-cleanup/e2e.md` và `docs/specs/unified-list-experience/e2e.md`, và luồng tạo của
`docs/specs/web-app-create/design.md`.

Đọc bổ sung ngày 2026-10-14 (lượt chuẩn hóa + "bổ sung full", không có user trong phiên):

- Client: `mains/AdminAppsFormSheet` (`handleSaveError`: `WEB_APP_NAME_EXISTS` → lỗi trên Name,
  `WEB_APP_CATEGORY_NOT_FOUND` → refetch danh mục, bỏ id cũ, lỗi trên Categories), `mains/AdminAppsTable`
  (`useClientSortedRows`, không phân trang, `emptyTitle` cố định), `mains/AdminAppsHideDialog`, `hooks/use*AdminApp*`
  (toast thành công), `ghosts/FormResetEffect`, `libs/query-client.ts` (toast lỗi toàn cục).
- Server: `services/{create-app,update-app,list-apps}.ts`, `services/shared/{announce-app,assert-categories-exist}.ts`,
  `middlewares/pipes/validation.pipe.ts` (`abortEarly: false`, `stripUnknown`, message dịch theo request),
  `middlewares/filters/error.filter.ts`, `app.ts` (thứ tự `express.json` → … → i18next),
  `server/src/i18n/locales/{en,vi}/webApp.json`.
- `README.md` `## Features` và test case của module lân cận (admin-categories, notifications, authz) để không lặp.

## Quyết định chốt

Các dòng của ma trận cũ không có test case riêng:

- **Q1** list-table-column-controls #2 / #3 / #10 (AuthN / AuthZ / loading) là cùng các guard của TC-ADMINAPPS-038 /
  -039 và TC-AUTHZ-001 — không tách case riêng. → REQ-ADMINAPPS-01, REQ-ADMINAPPS-04.
- **Q2** list-table-column-controls #11 (an toàn khi mutation) là N/A — sắp xếp không bao giờ ghi dữ liệu.
- **Q3** edit-apps dòng 7 (lọc / tìm kiếm trong sheet sửa) là N/A — sheet không có; lọc danh sách là
  TC-ADMINAPPS-011 … -018.
- **Q4** unified-list-experience phủ `/admin/users` (ADMUSERS); phần tương đương cho admin-apps là
  TC-ADMINAPPS-010 … -018.
- **Q5** (tự quyết 2026-10-14, cần user duyệt): `GET /admin/apps` không phân trang và bỏ qua `page` / `limit` (Joi
  `stripUnknown`) — docs không nói, chỉ thấy trong code; là mong muốn hay thiếu sót? → coi là **mong muốn**: client tải
  cả registry rồi sắp xếp phía client, registry nhỏ, không màn hình nào cần trang → REQ-ADMINAPPS-01 (TC-ADMINAPPS-065).
- **Q6** (tự quyết 2026-10-14, cần user duyệt): body không phải JSON hợp lệ hiện trả 500 (đọc code) — docs không nói;
  lăng kính 6 của suite là "không có 5xx" → kỳ vọng **400**, ghi BUG-ADMINAPPS-02 thay vì uốn kỳ vọng theo code →
  REQ-ADMINAPPS-06 (TC-ADMINAPPS-072). BUG-ADMINAPPS-02 sau đó gộp vào BUG-OPS-02 (đã sửa 2026-10-15, fix/open-bugs).
- **Q7** (tự quyết 2026-10-14, cần user duyệt): hợp đồng lỗi của server (400 `VALIDATION_ERROR` với `errors[]` theo
  trường, message theo `Accept-Language`, không 5xx với input sai kiểu) chưa có requirement riêng — thành requirement? →
  **có**, REQ-ADMINAPPS-06 mới, theo `validation.pipe.ts` + `webApp.json` (en / vi) (TC-ADMINAPPS-062, -071, -072).
- **Q8** (tự quyết 2026-10-14, cần user duyệt): toast thành công + câu đọc qua `#announcer` khi đăng ký / sửa / ẩn /
  hiện lại chỉ thấy trong code (`useAnnounce`, `adminApps.announce.*`) — mong muốn hay chi tiết cài đặt? → **mong
  muốn** (a11y), REQ-ADMINAPPS-07 mới (TC-ADMINAPPS-069, -070; TC-ADMINAPPS-055 đã phủ "updated").
- **Q9** (tự quyết 2026-10-14, cần user duyệt): TC-ADMINAPPS-057 (Hide / Unhide) trước đây chạy trên Blog đã bị
  TC-ADMINAPPS-037 đổi tên, nên phụ thuộc thứ tự (`mode: "serial"`). → mỗi test của `edit-app.e2e.ts` bắt đầu từ Blog
  như seed (afterEach khôi phục display name + status), bỏ serial; kỳ vọng giữ nguyên → REQ-ADMINAPPS-05.
- **Q10** (tự quyết 2026-10-14, cần user duyệt): server tự trim và gấp chữ thường cho `name` (cả POST lẫn PATCH), trim
  mọi chuỗi, coi chuỗi chỉ có khoảng trắng là rỗng, và đổi description / icon rỗng thành `null` — chỉ thấy trong code
  (Joi `.trim().lowercase()`, `create-app.ts` / `update-app.ts`). → coi là **mong muốn** (TC-ADMINAPPS-029, -054 đã
  khẳng định một phần) → REQ-ADMINAPPS-02, REQ-ADMINAPPS-04 (TC-ADMINAPPS-063, -064).
- **Q11** (tự quyết 2026-10-14, cần user duyệt): khi danh mục đã chọn bị xoá ở tab khác, sheet đăng ký phải làm gì? →
  theo code `handleSaveError`: giữ sheet mở, bỏ danh mục đã mất khỏi lựa chọn và báo
  `adminApps.form.validation.categoryIds.notFound` trên trường Categories → REQ-ADMINAPPS-02 (TC-ADMINAPPS-068).
- **Q12** (tự quyết 2026-10-14, cần user duyệt): test gộp hai TC (TC-ADMINAPPS-021 + -031, -026 + -036) không thể mang
  tên trùng tiêu đề cả hai → **tách** thành hai test, mỗi test mang đủ các kỳ vọng cũ của TC mình; không kỳ vọng nào
  bị bỏ → REQ-ADMINAPPS-02, REQ-ADMINAPPS-03.

## Tài khoản test

- Mọi case chạy bằng admin seed (`admin@test.com`); case quyền dùng thêm user seed (TC-ADMINAPPS-039, -061) và guest
  (TC-ADMINAPPS-038).
- Mốc seed (`server/src/database/seeders/data/web-apps.ts`, `data/test-data.ts` → `SEED_APPS`): Blog (content),
  Analytics Dashboard + Operations Console (internal-tools, chỉ admin), IDMS Portal (identity), Team Calendar
  (productivity, app **inactive** duy nhất) và Notes (productivity).
- Không có endpoint xoá: spec sửa mượn app seed `blog` rồi khôi phục (`restoreApp`); spec tạo đặt tên app `e2e-…` và
  xoá nó khỏi MongoDB sau đó, cùng favourite / usage / thông báo APP_AVAILABLE của nó (`utils/admin-apps.ts` →
  `deleteE2EApps`). TC-ADMINAPPS-027 / -068 tạo một danh mục tạm qua `/admin/categories` (chưa có client, gọi qua
  `api.call`) và xoá ngay trong `finally`.

## Ngoài phạm vi

- Xoá app: server không có endpoint xoá.
- Các dòng N/A của ma trận cũ (xem Q2, Q3).
- Bộ chọn danh mục trong sheet (thứ tự / primary / tối đa 5 / tìm kiếm / tạo nhanh): đã phủ ở TC-ADMINCATEGORIES-036 …
  -041, không lặp ở đây.
- Thông báo APP_AVAILABLE khi một app lần đầu hoạt động: TC-NOTIFICATIONS-056.
- Ma trận guard 401 / 403 của mọi endpoint admin và message 403 theo locale: TC-AUTHZ (`admin-endpoints.api.ts`).
- Giới hạn độ dài URL (2000) và `iconUrl` sai scheme ở form sửa: cùng rule zod / Joi đã phủ bằng TC-ADMINAPPS-029 /
  -040, không thêm biên riêng.

## Tech debt liên quan

- BUG-ADMINAPPS-01 (`../../defects/admin-apps.md`): `AdminAppsTable` luôn truyền `emptyTitle` = "No apps registered
  yet." vào `PageContent`, nên tìm kiếm không khớp lại báo danh sách trống (TC-ADMINAPPS-016) (đã sửa 2026-10-15, fix/open-bugs).
- BUG-ADMINAPPS-02 (`../../defects/admin-apps.md`): body JSON hỏng → 500 (TC-ADMINAPPS-072); lỗi nằm ở tầng chung của
  server nên mọi endpoint nhận JSON cùng bị. Gộp vào BUG-OPS-02 (đã sửa 2026-10-15, fix/open-bugs): giờ trả 400 `MALFORMED_BODY`.
- Mỗi lượt kích hoạt một app có role `user` (TC-ADMINAPPS-061) broadcast APP_AVAILABLE tới user seed; `deleteE2EApps`
  xoá các dòng đó theo `dedupeKey` `app:<id>`, nhưng worker ghi bất đồng bộ nên có thể còn sót — spec notifications
  không nên dựa vào số dòng của user seed.
