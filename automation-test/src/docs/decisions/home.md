# HOME — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `client/src/views/Home/**`
- `client/src/locales/{en,vi}/home.json`
- `server/src/modules/login-history` (`GET /login-history/stats`)
- `server/src/modules/recent-app` (`GET /users/me/recent-apps/stats`)
- `server/src/validators/schemas/{login-history,recent-app}.ts`

Chuyển đổi từ `docs/specs/home-activity-insights/e2e.md` (các dòng ma trận 1–13; dòng 14 — bản sửa filter ngày — vẫn
là unit test phía server, xem TC-HOME-023).

Phạm vi ban đầu của module: dashboard launcher tại `/` — lời chào, "Jump back in", biểu đồ hoạt động đăng nhập, phân
tách theo phương thức / thiết bị, bảng xếp hạng app dùng nhiều nhất và các link đi sâu của chúng (REQ-HOME-01…06).

Đọc thêm ngày 2026-10-14 (lượt bổ sung + chuẩn hoá, `/write-tests home`):

- `README.md` `## Features` (khối "App launcher dashboard") và mục "Smaller gaps"
- `docs/specs/home-activity-insights/design.md` (DR-1…16, §4.2 khối UI, §4.3 bản đồ điều hướng, §5 bảo mật, §6 ngoài phạm vi)
- `client/src/views/Home/**` (mọi `mains/`, `components/`, `hooks/`, `ghosts/`), `client/src/dataSources/Home/index.ts`,
  `client/src/hooks/useOpenApp.ts`, `client/src/locales/{en,vi}/home.json`
- `server/src/modules/login-history/login-history.routes.ts`, `server/src/modules/recent-app/{recent-app.routes.ts,services/stats.ts,constants}`,
  `server/src/validators/schemas/{login-history,recent-app}.ts`, `server/src/middlewares/pipes/validation.pipe.ts`,
  `server/src/i18n/locales/{en,vi}/validation.json`

## Quyết định chốt

_(trước 2026-10-14 chưa có quyết định qua hỏi đáp — kỳ vọng lấy từ code và README tại thời điểm viết)_

- Q1 (tự quyết 2026-10-14, cần user duyệt): README mục "Smaller gaps" nói biểu đồ hoạt động trên Home còn hard-code,
  trong khi `## Features` và code nói biểu đồ dùng dữ liệu thật — tin bên nào? → `## Features` + code (dòng "Smaller
  gaps" là dòng cũ chưa xoá sau `home-activity-insights`); kỳ vọng giữ biểu đồ dữ liệu thật → REQ-HOME-03.
- Q2 (tự quyết 2026-10-14, cần user duyệt): design §5 viết "rate limit Redis theo user như các route đọc khác" cho hai
  endpoint stats, nhưng code không gắn limiter nào và các route đọc tương tự (`GET /login-history`) cũng không có — có
  phải requirement không? → không; đưa vào "Ngoài phạm vi" → không REQ nào.
- Q3 (tự quyết 2026-10-14, cần user duyệt): cửa sổ thời gian ghi trên từng thẻ số (+ số lần bất thường trên thẻ thất bại)
  chỉ có ở design §7 và code, README không nhắc — có viết thành requirement? → có: design là nguồn tài liệu hợp lệ và
  tính năng đã ship → REQ-HOME-07 (TC-HOME-037, 038).
- Q4 (tự quyết 2026-10-14, cần user duyệt): bảng xếp hạng/số đếm app có loại app đã xoá khỏi lịch sử hoặc đã mất quyền
  không? Design §5 ("`topApps` lọc theo điều kiện hiển thị") + `recent-app/services/stats.ts` nói có → REQ-HOME-08
  (TC-HOME-048).
- Q5 (tự quyết 2026-10-14, cần user duyệt): khối "Explore" + CTA đếm catalogue chỉ có ở design §4.2 #7–8 và code, README
  không nhắc → vẫn là tính năng đã ship → REQ-HOME-09 (TC-HOME-015, 040).
- Q6 (tự quyết 2026-10-14, cần user duyệt): lỗi validation của hai endpoint stats phải mang message của catalogue theo
  ngôn ngữ request (CLAUDE.md gốc: message là key i18next dịch theo request)? → có, kể cả lỗi độ dài `tz`; app hiện trả
  câu Joi thô cho `tz` > 64 ký tự → BUG-HOME-01 (đã sửa 2026-10-15, fix/open-bugs) → REQ-HOME-03 (TC-HOME-046, 047).
- Q7 (tự quyết 2026-10-14, cần user duyệt): "mặc định 5 app" (TC-HOME-049) cần catalogue ≥ 6 app mới chứng minh được biên
  trên; seeder `web-apps.ts` chỉ cho user 3 app (Blog, IDMS Portal, Notes) nhưng database e2e còn app do các spec admin
  tạo → test mở tối đa 6 app và kỳ vọng `min(5, số app đã mở)`; khi catalogue < 6 app, biên trên không được chứng minh
  (test vẫn xanh) — không tạo app chung chỉ cho case này → REQ-HOME-06.
- Q8 (tự quyết 2026-10-14, cần user duyệt): tham số `userId` lạ trong query của hai endpoint stats → bị bỏ qua (Joi
  `stripUnknown`), dữ liệu luôn theo phiên (design §5) → P0 vì hỏng là rò dữ liệu → REQ-HOME-03, REQ-HOME-06 (TC-HOME-050).

## Tài khoản test

- Case trình duyệt stub cả hai endpoint stats bằng `page.route` để mọi số đếm, ngưỡng và trạng thái rỗng đều xác
  định; chạy với `timezoneId: Asia/Ho_Chi_Minh`, và cố định đồng hồ (`page.clock`) cho lời chào. Không ghi gì, không
  có gì phải hoàn tác.
- Case API đọc stats thật của user seed để kiểm hình dạng và tính nhất quán, và dùng tài khoản tạm ở những chỗ cần số
  chính xác (xếp hạng, tài khoản rỗng, cô lập dữ liệu).

## Dữ kiện server

- `range` là một trong `7d` / `30d` / `90d` (mặc định `7d`); `tz` phải resolve được trong `Intl` (chấp nhận cả tên
  canonical lẫn link, ≤ 64 ký tự).
- `byDay` có một bucket điền sẵn 0 cho mỗi ngày địa phương; `byMethod` có đủ năm phương thức và `byDevice` đủ bốn
  loại thiết bị, luôn có mặt.
- Bảng xếp hạng dựa trên `useCount` trọn đời, không theo range; `limit` 1…10, mặc định 5.
- Client: `SPARSE_THRESHOLD = 3`; lời chào sáng < 12:00 ≤ chiều < 18:00 ≤ tối; Quick Access hiện 4 ô và dự phòng
  sang catalogue khi người dùng chưa có lịch sử.

## Ngoài phạm vi

- Rate limit cho `GET /login-history/stats` và `GET /users/me/recent-apps/stats` (design §5) — code không có, xem Q2.
- Cache Redis cho stats (design DR-13 — hoãn), số lần mở app theo ngày / streak, gợi ý app thật cho "Explore", chọn
  timezone trong hồ sơ (design §6) — chưa build.
- Bấm một cột biểu đồ (recharts vẽ SVG, đích là `/login-history?dateRange=custom&fromDate=…&toDate=…`): không có phần
  tử truy cập được để bấm ổn định; filter phía server đã có unit test (xem TC-HOME-023).
- Token sau logout, token sai: phủ chung ở module `auth` / `authz`, không lặp riêng cho hai endpoint stats.

- Link theo ngày bao trọn mọi lần đăng nhập của ngày địa phương (TC-HOME-023) không tự động hoá: cần các dòng
  `login_histories` có ngày tương đối theo lượt chạy, thứ seed không ghi; bản thân filter đã được phủ bởi
  `server/src/modules/login-history/helpers/login-history-filter.spec.ts`.

## Tech debt liên quan

_(không có)_
