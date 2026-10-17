# PROFILE — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-PROFILE-01

- **TC:** TC-PROFILE-017, TC-PROFILE-040 · **Requirement:** REQ-PROFILE-02
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-011
- **Bước tái hiện:** chạy test của TC-PROFILE-040 và TC-PROFILE-017 — `tests/api/profile/profile.api.ts`,
  `tests/e2e/profile/personal-info.e2e.ts`
- **Mong đợi:** sign-up và hồ sơ dùng chung một khoảng tuổi
- **Thực tế:** user 101–120 tuổi đăng ký được nhưng không bao giờ lưu được hồ sơ (trần ngày sinh 100 so với 120; form luôn gửi lại ngày sinh)
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — zod và Joi của hồ sơ dùng cùng khoảng 13–120 năm với sign-up (`getDateOfBirthBounds`)

### BUG-PROFILE-02

- **TC:** TC-PROFILE-019 · **Requirement:** REQ-PROFILE-02
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-012
- **Bước tái hiện:** chạy test của TC-PROFILE-019 — `tests/e2e/profile/personal-info.e2e.ts`
- **Mong đợi:** xoá trống một trường thì được lưu
- **Thực tế:** không xoá được số điện thoại — trường tuỳ chọn để trống bị bỏ khỏi PATCH, giá trị cũ quay lại trong khi vẫn hiện "Profile updated"
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — form gửi `null` cho trường tuỳ chọn để trống; Joi `.allow(null)` và repository `$unset` trường đó

### BUG-PROFILE-03

- **TC:** TC-PROFILE-020 · **Requirement:** REQ-PROFILE-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-025
- **Bước tái hiện:** chạy test của TC-PROFILE-020 — `tests/e2e/profile/personal-info.e2e.ts`
- **Mong đợi:** header hiện tên mới
- **Thực tế:** header hồ sơ giữ tên cũ sau khi lưu (đọc từ idToken không được cấp lại)
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `ProfileCard` đọc tên / avatar từ query `myProfile` (được `setQueryData` sau khi lưu), idToken chỉ là fallback

### BUG-PROFILE-04

- **TC:** TC-PROFILE-015, TC-PROFILE-049 · **Requirement:** REQ-PROFILE-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 (TC-PROFILE-049: 2026-10-14, đọc code, chưa chạy) · **Mã cũ:** BUG-026
- **Bước tái hiện:** chạy test của TC-PROFILE-015 và TC-PROFILE-049 (51 ký tự) — `tests/e2e/profile/personal-info.e2e.ts`
- **Mong đợi:** thông báo đã được dịch
- **Thực tế:** `client/src/locales/*/common.json` → `validation` không có mục `firstName` / `lastName`, nên
  `FormFieldMessage` hiện nguyên key zod: "required" khi để trống, "maxLength" khi quá 50 ký tự
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — thêm `common.validation.firstName` / `lastName` (en + vi)

### BUG-PROFILE-05

- **TC:** TC-PROFILE-045 · **Requirement:** REQ-PROFILE-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-PROFILE-045 — `tests/api/profile/profile.api.ts`
- **Mong đợi:** `PATCH /users/me` với `fullName: "   "` trả 400 `VALIDATION_ERROR` trên `fullName` (decisions Q5)
- **Thực tế:** `updateProfileSchema` không `.trim()` và `SAFE_FULLNAME_PATTERN` (`/^[\p{L}\s\-'.]+$/u`) cho phép chuỗi
  chỉ có khoảng trắng dài ≥ 2, nên tên trống được lưu (200)
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `updateProfileSchema.fullName` `.trim()` trước khi kiểm, nên chỉ khoảng trắng → 400 `fullName.required`

### BUG-PROFILE-06

- **TC:** TC-PROFILE-016 · **Requirement:** REQ-PROFILE-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-17 (chạy thật)
- **Bước tái hiện:** ở múi giờ phía đông UTC (vd UTC+7), nhập ngày sinh đúng 13 năm trước hôm nay trên `/profile` (hoặc bước info của đăng ký).
- **Mong đợi:** được chấp nhận — đúng 13 tuổi nằm trong khoảng 13–120.
- **Thực tế:** form báo "Date of birth must be between 13–120 years old": client parse `YYYY-MM-DD` thành nửa đêm UTC (07:00 giờ địa phương) rồi so với mốc nửa đêm địa phương. Server thì tính mốc theo thời điểm hiện tại UTC và **một lần lúc khởi động** cho schema đăng ký, nên mốc trôi theo thời gian chạy.
- **Đã sửa:** 2026-10-17, nhánh fix/open-bugs — client so theo ngày địa phương (`parseDateOnly`); server tính mốc theo ngày lịch, có tính múi giờ UTC-12…UTC+14, và tính lại mỗi request (`getDateOfBirthBounds`, `base.spec.ts`).
