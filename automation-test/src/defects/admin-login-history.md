# ADMINLOGINHISTORY — Bug log

## Đang mở

| Bug                                                   | Mức        | TC                                             | Tóm tắt                                                                                                                        |
| ----------------------------------------------------- | ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [BUG-ADMINLOGINHISTORY-01](#bug-adminloginhistory-01) | Trung bình | TC-ADMINLOGINHISTORY-009                       | Bộ lọc Device ở lịch sử đăng nhập admin có hiển thị nhưng không bao giờ được gửi lên API                                       |
| [BUG-ADMINLOGINHISTORY-02](#bug-adminloginhistory-02) | Thấp       | TC-ADMINLOGINHISTORY-043, TC-LOGINHISTORY-036  | Lỗi validation của method, deviceType, clientType, userId, fromDate, toDate và khoảng ngày trả về key i18n thô thay vì message |
| [BUG-ADMINLOGINHISTORY-03](#bug-adminloginhistory-03) | Thấp       | TC-ADMINLOGINHISTORY-037, TC-NOTIFICATIONS-058 | Namespace `loginHistory` không được nạp vào i18next nên lỗi id chi tiết trả key thô (`errors.invalidId`)                       |

### BUG-ADMINLOGINHISTORY-01

- **TC:** TC-ADMINLOGINHISTORY-009 · **Requirement:** REQ-ADMINLOGINHISTORY-01
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-013
- **Bước tái hiện:** chạy test của TC-ADMINLOGINHISTORY-009 — `tests/e2e/admin-login-history/list-filters.e2e.ts` ("Device filter reaches the API")
- **Mong đợi:** bộ lọc được áp dụng
- **Thực tế:** bộ lọc Device ở lịch sử đăng nhập admin có hiển thị nhưng không bao giờ được gửi lên API

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

## Đã sửa

_(chưa có)_
