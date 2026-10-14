# PROFILE — Bug log

## Đang mở

| Bug                               | Mức        | TC                             | Tóm tắt                                                                                                                            |
| --------------------------------- | ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| [BUG-PROFILE-01](#bug-profile-01) | Trung bình | TC-PROFILE-017, TC-PROFILE-040 | User 101–120 tuổi đăng ký được nhưng không bao giờ lưu được hồ sơ (trần ngày sinh 100 so với 120; form luôn gửi lại ngày sinh)     |
| [BUG-PROFILE-02](#bug-profile-02) | Trung bình | TC-PROFILE-019                 | Không xoá được số điện thoại — trường tuỳ chọn để trống bị bỏ khỏi PATCH, giá trị cũ quay lại trong khi vẫn hiện "Profile updated" |
| [BUG-PROFILE-03](#bug-profile-03) | Thấp       | TC-PROFILE-020                 | Header hồ sơ giữ tên cũ sau khi lưu (đọc từ idToken không được cấp lại)                                                            |
| [BUG-PROFILE-04](#bug-profile-04) | Thấp       | TC-PROFILE-015, TC-PROFILE-049 | First name / last name lỗi hiện key zod thô ("required", "maxLength") — không có message cho `firstName`/`lastName`                |
| [BUG-PROFILE-05](#bug-profile-05) | Thấp       | TC-PROFILE-045                 | Họ tên chỉ toàn khoảng trắng được lưu (schema không trim, pattern cho phép `\s`)                                                   |

### BUG-PROFILE-01

- **TC:** TC-PROFILE-017, TC-PROFILE-040 · **Requirement:** REQ-PROFILE-02
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-011
- **Bước tái hiện:** chạy test của TC-PROFILE-040 và TC-PROFILE-017 — `tests/api/profile/profile.api.ts`,
  `tests/e2e/profile/personal-info.e2e.ts`
- **Mong đợi:** sign-up và hồ sơ dùng chung một khoảng tuổi
- **Thực tế:** user 101–120 tuổi đăng ký được nhưng không bao giờ lưu được hồ sơ (trần ngày sinh 100 so với 120; form luôn gửi lại ngày sinh)

### BUG-PROFILE-02

- **TC:** TC-PROFILE-019 · **Requirement:** REQ-PROFILE-02
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-012
- **Bước tái hiện:** chạy test của TC-PROFILE-019 — `tests/e2e/profile/personal-info.e2e.ts`
- **Mong đợi:** xoá trống một trường thì được lưu
- **Thực tế:** không xoá được số điện thoại — trường tuỳ chọn để trống bị bỏ khỏi PATCH, giá trị cũ quay lại trong khi vẫn hiện "Profile updated"

### BUG-PROFILE-03

- **TC:** TC-PROFILE-020 · **Requirement:** REQ-PROFILE-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-025
- **Bước tái hiện:** chạy test của TC-PROFILE-020 — `tests/e2e/profile/personal-info.e2e.ts`
- **Mong đợi:** header hiện tên mới
- **Thực tế:** header hồ sơ giữ tên cũ sau khi lưu (đọc từ idToken không được cấp lại)

### BUG-PROFILE-04

- **TC:** TC-PROFILE-015, TC-PROFILE-049 · **Requirement:** REQ-PROFILE-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 (TC-PROFILE-049: 2026-10-14, đọc code, chưa chạy) · **Mã cũ:** BUG-026
- **Bước tái hiện:** chạy test của TC-PROFILE-015 và TC-PROFILE-049 (51 ký tự) — `tests/e2e/profile/personal-info.e2e.ts`
- **Mong đợi:** thông báo đã được dịch
- **Thực tế:** `client/src/locales/*/common.json` → `validation` không có mục `firstName` / `lastName`, nên
  `FormFieldMessage` hiện nguyên key zod: "required" khi để trống, "maxLength" khi quá 50 ký tự

### BUG-PROFILE-05

- **TC:** TC-PROFILE-045 · **Requirement:** REQ-PROFILE-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-PROFILE-045 — `tests/api/profile/profile.api.ts`
- **Mong đợi:** `PATCH /users/me` với `fullName: "   "` trả 400 `VALIDATION_ERROR` trên `fullName` (decisions Q5)
- **Thực tế:** `updateProfileSchema` không `.trim()` và `SAFE_FULLNAME_PATTERN` (`/^[\p{L}\s\-'.]+$/u`) cho phép chuỗi
  chỉ có khoảng trắng dài ≥ 2, nên tên trống được lưu (200)

## Đã sửa

_(chưa có)_
