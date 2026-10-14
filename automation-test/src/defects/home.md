# HOME — Bug log

## Đang mở

| Bug                         | Mức  | TC          | Tóm tắt                                                               |
| --------------------------- | ---- | ----------- | --------------------------------------------------------------------- |
| [BUG-HOME-01](#bug-home-01) | Thấp | TC-HOME-047 | `tz` dài quá 64 ký tự trả về message Joi thô, chưa dịch, kèm lỗi đúng |

### BUG-HOME-01

- **TC:** TC-HOME-047 · **Requirement:** REQ-HOME-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** `GET /login-history/stats?tz=<65 ký tự "x">` với `Accept-Language: en` (hoặc vi).
- **Mong đợi:** 400 `VALIDATION_ERROR`; mọi mục `errors[]` của `tz` mang message của catalogue
  ("Invalid timezone." / "Múi giờ không hợp lệ."), như mọi lỗi validation khác của server.
- **Thực tế (đọc code):** `loginHistoryStatsQuerySchema` (`server/src/validators/schemas/login-history.ts`) chỉ khai
  `.messages({ "any.only": "validation:timezone.invalid" })`; quy tắc `.max(TIMEZONE_MAX_LENGTH)` không có key, nên
  `validation.pipe.ts` (`abortEarly: false`) đẩy thêm một mục `string.max` mang câu tiếng Anh mặc định của Joi
  (`"tz" length must be less than or equal to 64 characters long`) — `req.t` không tìm thấy key nên trả nguyên câu,
  kể cả khi client xin tiếng Việt.

## Đã sửa

_(chưa có)_
