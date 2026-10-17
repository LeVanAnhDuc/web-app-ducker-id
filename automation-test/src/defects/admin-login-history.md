# ADMINLOGINHISTORY — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-ADMINLOGINHISTORY-01

- **TC:** TC-ADMINLOGINHISTORY-009 · **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-013
- **Bước tái hiện:** chạy test của TC-ADMINLOGINHISTORY-009 — `tests/e2e/admin-login-history/list-filters.e2e.ts` ("Device filter reaches the API")
- **Mong đợi:** bộ lọc được áp dụng
- **Thực tế:** bộ lọc Device ở lịch sử đăng nhập admin có hiển thị nhưng không bao giờ được gửi lên API
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `AdminLoginHistoryTable` đưa `deviceType` (đã kiểm bằng `isLoginHistoryDeviceType`) vào params gửi API, như trang lịch sử của user.

### BUG-ADMINLOGINHISTORY-02

- **TC:** TC-ADMINLOGINHISTORY-043, TC-LOGINHISTORY-036 · **Requirement:** REQ-ADMINLOGINHISTORY-04, REQ-LOGINHISTORY-07
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Gộp:** BUG-LOGINHISTORY-02 (cùng nguyên nhân, ghi trùng ở module login-history ngày 2026-10-14) — mã đó không dùng lại
- **Bước tái hiện:** `GET /api/v1/admin/login-history?method=telepathy` (admin, `Accept-Language: en`); tương tự với
  `deviceType`, `clientType`, `userId`, `fromDate`, `toDate` sai và `fromDate` > `toDate`. Test:
  `tests/api/admin-login-history/login-history.api.ts` ("Each invalid filter is named with a readable message").
- **Mong đợi:** mục `errors` của trường đó mang message đã dịch, như `status` ("Invalid status filter.").
- **Thực tế:** `server/src/validators/schemas/login-history.ts` dùng các key `validation:method.invalid`,
  `validation:deviceType.invalid`, `validation:clientType.invalid`, `validation:userId.invalid`,
  `validation:fromDate.invalid`, `validation:toDate.invalid`, `validation:dateRange.invalid`, nhưng
  `server/src/i18n/locales/{en,vi}/validation.json` không có key nào trong số đó, nên i18next trả lại chính key
  (`method.invalid`…). Schema user `/login-history` dùng chung các key này.
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — thêm `method`, `deviceType`, `clientType`, `userId`, `fromDate`, `toDate`, `dateRange` (cùng `priority`, `address` cũng đang thiếu) vào `server/src/i18n/locales/{en,vi}/validation.json`; spec `server/src/i18n/catalogue.spec.ts` kiểm mọi key `ns:key` trong code có ở cả hai locale.

### BUG-ADMINLOGINHISTORY-03

- **TC:** TC-ADMINLOGINHISTORY-037, TC-NOTIFICATIONS-058 · **Requirement:** REQ-ADMINLOGINHISTORY-04
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (chạy thật)
- **Bước tái hiện:** `GET /api/v1/admin/login-history/not-an-id` (admin, `Accept-Language: en`). Test:
  `tests/api/admin-login-history/login-history.api.ts` ("Detail id errors carry their code and message").
- **Mong đợi:** `errors[]` của `id` mang "Invalid login history id"; 404 mang "Login history record not found".
- **Thực tế:** `errors[0].message` là `errors.invalidId`. Key có trong `server/src/i18n/locales/{en,vi}/loginHistory.json`,
  nhưng danh sách `ns` trong `server/src/i18n/config.ts` không có `loginHistory` (cũng thiếu `changePassword`,
  `contactAdmin`, `notification`), nên namespace không bao giờ được nạp và i18next trả key bỏ tiền tố. Ảnh hưởng mọi
  key `loginHistory:*`, gồm cả `loginHistory:errors.notFound` của 404.
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `ns` trong `server/src/i18n/config.ts` thêm `loginHistory`, `changePassword`, `notification`; `catalogue.spec.ts` kiểm danh sách `ns` khớp đúng các file locale.
