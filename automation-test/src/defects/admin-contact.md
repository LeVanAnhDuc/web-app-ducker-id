# ADMINCONTACT — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-ADMINCONTACT-01

- **TC:** TC-ADMINCONTACT-027 · **Requirement:** REQ-ADMINCONTACT-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-020
- **Bước tái hiện:** chạy test của TC-ADMINCONTACT-027 — `tests/e2e/admin-contact/detail-status.e2e.ts:198`
- **Mong đợi:** hiện User ID
- **Thực tế:** trang chi tiết liên hệ của admin không bao giờ hiện ai đã gửi yêu cầu — DTO bỏ mất `userId`; IP không bao giờ được lưu
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — model lưu `ipAddress` (`req.ip`) khi gửi; `GET /admin/contacts/:id` trả `AdminContactDetailItemDto` (thêm `userId`, `ipAddress`), view của chủ sở hữu giữ nguyên; thẻ admin chỉ hiện IP khi có.

### BUG-ADMINCONTACT-02

- **TC:** TC-ADMINCONTACT-035 · **Requirement:** REQ-ADMINCONTACT-04
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-ADMINCONTACT-035 — `tests/api/admin-contact/contacts.api.ts:307`
- **Mong đợi:** `message` của `GET /admin/contacts`, `GET /admin/contacts/:id`, `PATCH /admin/contacts/:id/status` và
  `errors[].message` của id sai định dạng / status không hợp lệ / thiếu status là câu đã dịch theo `Accept-Language`
- **Thực tế:** controller dùng `contactAdmin:success.getContactList` / `getContactDetail` / `updateContactStatus`, Joi dùng
  `contactAdmin:errors.invalidId` / `statusInvalid` / `statusRequired`; không key nào có trong
  `server/src/i18n/locales/{en,vi}/contactAdmin.json`, nên i18next trả nguyên key
- **Liên quan (chạy thật 2026-10-14, phía user `GET /contacts`):** thêm key vào `contactAdmin.json` chưa đủ. Key có sẵn
  cũng ra thô: `message` là `contactAdmin:success.getMyContacts` dù key có trong file — mọi success message đều thô
  ([BUG-ADMINUSERS-04](admin-users.md#bug-adminusers-04)); `errors[].message` của id sai là `errors.invalidId` (mất tiền
  tố) vì namespace `contactAdmin` không được server i18n nạp
  ([BUG-ADMINLOGINHISTORY-03](admin-login-history.md#bug-adminloginhistory-03)).
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — thêm `success.getContactList` / `getContactDetail` / `updateContactStatus` và `errors.invalidId` / `statusInvalid` / `statusRequired` vào `contactAdmin.json` (en, vi); success message được dịch nhờ bản sửa BUG-ADMINUSERS-04.
