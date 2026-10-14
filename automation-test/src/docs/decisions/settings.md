# SETTINGS — quyết định

## Nguồn

Đọc ngày 2026-10-10. Test case cho `REQ-SETTINGS-01` … `REQ-SETTINGS-04` (trước đây ở `docs/requirements.md`).

- Client: `client/src/components/UserMenu/**` (LanguageSubmenu, ThemeSubmenu), `client/src/contexts/ThemeProvider`
  (next-themes, thuộc tính class, mặc định `system`), `client/src/i18n/{config,routing}.ts` (mặc định `en`, `vi`,
  `localePrefix: "as-needed"`), component `FormatTime` và hook `useFormatTime`, cấu hình sidebar, copy trong
  `client/src/locales/{en,vi}/{common,dashboard}.json`.
- Đọc lại 2026-10-14 (`/write-tests settings`, bổ sung coverage): `README.md` → `## Features` ("Language and
  appearance"), `docs/specs/locale-time-format/design.md` (bộ 3 kiểu `dateLong` / `datetime` / `relative`, hướng A:
  locale của app + múi giờ của máy), `docs/specs/remove-team-feature/design.md`,
  `client/src/components/UserMenu/**` (UtilityMenuItems render cả cho guest), `client/src/components/FormatTime`,
  `client/src/utils/index.ts` (`formatDateTime`, `INVALID_DATE_DISPLAY`), `client/src/components/NotificationItem`,
  `client/src/dataSources/{LoginHistory,AdminUsers,MyContacts,ContactAdmin}`, `client/src/i18n/{config,routing}.ts`,
  `client/src/middleware.ts`, `client/src/app/[locale]/layout.tsx` (`hasLocale` → `notFound()`). Không có route server
  nào thuộc module này.
- Chuyển từ `docs/specs/locale-time-format/e2e.md` (TC-SETTINGS-001 … -016) và `docs/specs/remove-team-feature/e2e.md`
  (TC-SETTINGS-010 … -013).

## Quyết định chốt

- **Q1** Các hàng của ma trận cũ không có case riêng thì được phủ ở đâu? → locale-time-format §2 / §3 / §9 / §10 (AuthN,
  AuthZ, loading, mutation) là N/A — FormatTime là renderer thuần; §4c (giá trị `undefined`) thuộc unit test; §12b
  (đổi text SSR→CSR) được phủ bởi kiểm tra không-mismatch của TC-SETTINGS-009 cùng việc render theo múi giờ cục bộ
  của TC-SETTINGS-015. → REQ-SETTINGS-03
- **Q2** Các case gỡ Team mở trang nào? → các hàng của remove-team-feature đều là assertion phủ định; suite cũ mở
  `/account-settings`, trang này về sau cũng bị gỡ — nay các case mở `/profile`, trang Settings còn lại. →
  REQ-SETTINGS-04
- **Q3** (tự quyết 2026-10-14, cần user duyệt): guest đổi được ngôn ngữ / giao diện là chủ ý hay sót? → chủ ý: README
  chỉ nói "switched from the user menu", và `UserMenu` cố ý render `UtilityMenuItems` (Theme, Language) cho cả nhánh chưa
  đăng nhập → thành requirement mới → REQ-SETTINGS-05 (TC-SETTINGS-038, -041)
- **Q4** (tự quyết 2026-10-14, cần user duyệt): design ghi ví dụ vi `29 thg 6, 2026, 15:04`, nhưng engine mà design chốt
  là `Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" })`, và thứ tự ngày–giờ của vi do dữ liệu
  CLDR/ICU của trình duyệt quyết (có thể là giờ trước ngày) → kiểm từng phần (ngày dạng "29 thg 6, 2026", giờ 24h
  "15:04", không AM/PM/SA/CH), không kiểm thứ tự; en kiểm nguyên chuỗi "Jun 29, 2026, 3:04 PM" như design →
  REQ-SETTINGS-03 (TC-SETTINGS-035)
- **Q5** (tự quyết 2026-10-14, cần user duyệt): locale của trình duyệt có được ảnh hưởng tới định dạng không? → không:
  mục tiêu của design là "format theo locale của app, không theo locale của trình duyệt" → REQ-SETTINGS-03
  (TC-SETTINGS-034)
- **Q6** (tự quyết 2026-10-14, cần user duyệt): prefix locale không hỗ trợ (`/fr/apps`) phải ra sao? → not-found (code:
  middleware `as-needed` + `hasLocale` → `notFound()` trong `[locale]/layout.tsx`); không có tài liệu nói khác, và rơi
  về tiếng Anh như thể `fr` hợp lệ mới là lỗi → REQ-SETTINGS-01 (TC-SETTINGS-039)
- **Q7** (tự quyết 2026-10-14, cần user duyệt): ngôn ngữ có phải được nhớ qua lần truy cập sau (cookie `NEXT_LOCALE`)
  hay tự chọn theo `Accept-Language` không? → không viết thành requirement: README / docs không hứa, đó là mặc định
  của next-intl chưa ai chốt → "Ngoài phạm vi"; REQ-SETTINGS-01 không đổi
- **Q8** (tự quyết 2026-10-14, cần user duyệt): design §6 ghi ngưỡng "<1 phút → just now / vài giây trước" và ví dụ
  "2 hours ago", trong khi engine design chốt cho `relative` là `date-fns/formatDistanceToNow` ("less than a minute
  ago", "about 2 hours ago") → các chuỗi trong design là minh hoạ, kỳ vọng lấy đúng output của engine đã chốt (en và
  vi) → REQ-SETTINGS-03 (TC-SETTINGS-036)

## Tài khoản test

Chỉ đọc: ngôn ngữ và theme nằm trong URL, một cookie và localStorage của một browser context dùng một lần; không ghi
gì vào tài khoản. Session là `user@test.com` đã seed (và `admin@test.com` qua `adminPage` cho TC-SETTINGS-008). Các
dòng login-history, notification (TC-SETTINGS-036) và "My Requests" (TC-SETTINGS-037) được phục vụ qua intercept
`page.route` (`tests/e2e/settings/helpers.ts`) để kiểm hợp đồng render trên những thời điểm biết trước. TC-SETTINGS-038
/ -041 chạy với role `guest`.

## Ngoài phạm vi

- locale-time-format §2 / §3 / §9 / §10 (AuthN, AuthZ, loading, mutation) — N/A vì FormatTime là renderer thuần.
- §4c (giá trị `undefined`) — thuộc unit test.
- Tầng API: module không có endpoint nào (ngôn ngữ ở URL, theme ở localStorage, định dạng do `Intl` / date-fns ở
  client) — lăng kính bảo mật (authz theo role, token sau logout, 5xx) không có gì để áp; quyền vào các trang được
  dùng làm bề mặt (`/login-history`, `/admin/users`, `/contacts/me`) do module của trang đó và `authz` chứng minh.
- Ghi nhớ ngôn ngữ qua lần truy cập sau (cookie `NEXT_LOCALE`) và tự chọn theo `Accept-Language` (Q7).
- Đổi ngôn ngữ hai lần liên tiếp khi transition đang chạy: item bị `disabled` trong lúc `pending`, cửa sổ quá ngắn để
  kiểm ổn định mà không chạm vào timing nội bộ.

## Tech debt liên quan

_(không có)_
