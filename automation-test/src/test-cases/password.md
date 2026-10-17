# PASSWORD — test case

Khôi phục mật khẩu (OTP, magic link), đổi mật khẩu trên trang profile, buộc đổi sau khi admin reset, việc đăng xuất các session khác, giới hạn gửi khôi phục và lối vào trang khôi phục (REQ-PASSWORD-01…08).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/password.md

## Đổi mật khẩu trên trang profile (REQ-PASSWORD-03)

### TC-PASSWORD-001 — Changing the password keeps the current session

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest + đăng nhập bằng tài khoản dùng một lần
- **Kỹ thuật:** chuyển trạng thái (hợp lệ: mật khẩu cũ → mật khẩu mới, session được xoay vòng)
- **Tiền điều kiện:** một tài khoản dùng một lần đã đăng nhập ở `/profile`
- **Bước:**
  1. Nhập mật khẩu hiện tại và mật khẩu mới hợp lệ hai lần; bấm "Update Password".
  2. Reload trang.
- **Mong đợi:** "Password updated successfully"; vẫn ở `/profile` sau khi
  reload (refresh cookie của thiết bị này đã được xoay vòng); mật khẩu mới đăng
  nhập được, mật khẩu cũ bị từ chối.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-002 — A 200 from the server shows success and stays on the page

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (phản hồi server: thành công)
- **Tiền điều kiện:** PATCH được mock trả 200
- **Bước:**
  1. Điền form hợp lệ, submit.
- **Mong đợi:** toast thành công, URL vẫn là `/profile`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-003 — Signed-out visitors cannot reach the form

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — vào URL trực tiếp khi không có session)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/profile`.
- **Mong đợi:** bị redirect về `/login`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-004 — A mismatched confirmation is blocked on the client

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (confirm ≠ new)
- **Tiền điều kiện:** `/profile`
- **Bước:**
  1. Nhập mật khẩu hiện tại và mật khẩu mới hợp lệ, cùng một confirm khác; submit.
- **Mong đợi:** ô confirm `aria-invalid="true"`; không có PATCH nào được gửi.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-005 — A wrong current password is shown on the current-password field

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (current sai × new hợp lệ)
- **Tiền điều kiện:** PATCH được mock trả 400 `CHANGE_PASSWORD_WRONG_CURRENT`
- **Bước:**
  1. Submit với mật khẩu hiện tại sai.
- **Mong đợi:** "Current password is incorrect" dưới ô current, ô này `aria-invalid`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-006 — A new password equal to the current one is shown on the new-password field

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (new = current)
- **Tiền điều kiện:** PATCH được mock trả 400 `CHANGE_PASSWORD_SAME_AS_CURRENT`
- **Bước:**
  1. Submit với new = current.
- **Mong đợi:** "New password must be different from your current password", ô new `aria-invalid`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-007 — Each invalid password class is blocked before the API

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (rỗng / thiếu chữ hoa / thiếu chữ thường / thiếu số / thiếu ký tự đặc biệt)
- **Tiền điều kiện:** `/profile`
- **Bước:**
  1. Với mỗi lớp, nhập giá trị đó vào new + confirm rồi submit.
- **Mong đợi:** ô new `aria-invalid`; không có PATCH.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-008 — An empty current password is blocked

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (current rỗng)
- **Tiền điều kiện:** `/profile`
- **Bước:**
  1. Điền new + confirm, gõ rồi xoá ô current, submit.
- **Mong đợi:** ô current `aria-invalid`; không có PATCH.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-009 — Client policy wins when current is wrong and new is invalid

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (current sai × new không hợp lệ)
- **Tiền điều kiện:** `/profile`
- **Bước:**
  1. Current sai, new vi phạm chính sách; submit.
- **Mong đợi:** ô new `aria-invalid`; không có PATCH (server không bao giờ được hỏi).
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-010 — A pristine form cannot be submitted or cancelled

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (pristine)
- **Tiền điều kiện:** `/profile`, chưa gõ gì
- **Bước:**
  1. Xem các nút của card.
- **Mong đợi:** "Update Password" và "Cancel" của card đều bị disable; không có PATCH.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-011 — New-password length boundaries in the form

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA — 7 từ chối · 8 chấp nhận · 129 từ chối)
- **Tiền điều kiện:** PATCH được mock trả 200 cho trường hợp được chấp nhận
- **Bước:**
  1. Submit mật khẩu hợp lệ theo chính sách dài 7, 8 và 129 ký tự.
- **Mong đợi:** 7 và 129 bị `aria-invalid`, không có PATCH; 8 tới được server và hiện thành công.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-012 — The form renders its labelled fields

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** —
- **Tiền điều kiện:** `/profile`
- **Bước:**
  1. Tìm Current / New / Confirm New Password theo label và nút submit.
- **Mong đợi:** tất cả đều hiển thị (label được gắn với input theo cách lập trình).
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-013 — The form and its server error are Vietnamese under /vi

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (locale vi)
- **Tiền điều kiện:** `/vi/profile`; PATCH được mock trả 400 wrong-current cho bước 2
- **Bước:**
  1. Kiểm tra heading.
  2. Submit với mật khẩu hiện tại sai.
- **Mong đợi:** heading "Đổi mật khẩu"; lỗi "Mật khẩu hiện tại không đúng".
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-014 — A server failure keeps the values and shows an error

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — 500)
- **Tiền điều kiện:** PATCH được mock trả 500
- **Bước:**
  1. Submit form hợp lệ.
- **Mong đợi:** "Server error. Please try again later." (toast 5xx toàn cục — card
  chỉ map lỗi theo field; "Failed to update password" của spec cũ không bao giờ
  được render); giá trị được giữ; vẫn ở `/profile`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-015 — Inputs are disabled while the request is in flight

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — mạng chậm)
- **Tiền điều kiện:** PATCH bị giữ lại, rồi huỷ
- **Bước:**
  1. Submit form hợp lệ.
- **Mong đợi:** ba input bị disable cho tới khi request kết thúc.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-016 — A rapid double click sends exactly one PATCH

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — submit hai lần)
- **Tiền điều kiện:** PATCH được mock trả 200 có độ trễ
- **Bước:**
  1. Bấm "Update Password", rồi force-click thêm lần nữa.
- **Mong đợi:** một PATCH; toast thành công.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-017 — Keyboard focus follows the field order

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** `/profile`
- **Bước:**
  1. Tab từ ô current (sau mỗi ô có một nút hiện/ẩn).
- **Mong đợi:** current → toggle → new → toggle → confirm.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PASSWORD-018 — A trailing space in the new password does not break the form

- **Requirement:** REQ-PASSWORD-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — khoảng trắng)
- **Tiền điều kiện:** `/profile`
- **Bước:**
  1. Gõ `NewPass@123 ` (có khoảng trắng cuối) vào new và confirm; không submit.
- **Mong đợi:** trang vẫn dùng được và ô báo một trạng thái `aria-invalid` xác
  định (chỉ quan sát — không submit gì; cả hai chính sách đều từ chối khoảng
  trắng lúc submit, theo pattern của TC-PASSWORD-007).
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

## Đổi mật khẩu — API (REQ-PASSWORD-03, REQ-PASSWORD-05)

### TC-PASSWORD-019 — A password change signs out the other sessions

- **Requirement:** REQ-PASSWORD-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** tài khoản dùng một lần
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: refresh bằng token từ trước khi đổi)
- **Tiền điều kiện:** một tài khoản dùng một lần đăng nhập hai lần ("thiết bị khác", "thiết bị này")
- **Bước:**
  1. Refresh bằng cookie của thiết bị khác (200).
  2. Đổi mật khẩu từ thiết bị này.
  3. Refresh lại bằng cookie của thiết bị khác.
- **Mong đợi:** bước 3 → 403 `AUTH_PASSWORD_CHANGED` (tokenVersion được tăng).
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PASSWORD-020 — Change password without a token is refused

- **Requirement:** REQ-PASSWORD-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — thiếu xác thực)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `PATCH /auth/change-password` không có header Authorization.
- **Mong đợi:** 401 `AUTH_MISSING_TOKEN`.
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PASSWORD-021 — Each failing rule has its own error and changes nothing

- **Requirement:** REQ-PASSWORD-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** tài khoản dùng một lần
- **Kỹ thuật:** bảng quyết định (R1 thiếu current · R2 new vi phạm chính sách · R3 confirm không khớp · R4 current sai · R5 new = current)
- **Tiền điều kiện:** một session của tài khoản dùng một lần (≤ 5 PATCH — limiter đếm mọi lần thử)
- **Bước:**
  1. Gửi một request cho mỗi rule.
- **Mong đợi:** R1–R3 → 400 `VALIDATION_ERROR` nêu tên field; R4 → 400
  `CHANGE_PASSWORD_WRONG_CURRENT`; R5 → 400 `CHANGE_PASSWORD_SAME_AS_CURRENT`;
  mật khẩu ban đầu vẫn đăng nhập được.
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PASSWORD-022 — New-password length boundaries on the server

- **Requirement:** REQ-PASSWORD-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** tài khoản dùng một lần
- **Kỹ thuật:** giá trị biên (BVA — 7 · 8 · 128 · 129)
- **Tiền điều kiện:** mỗi độ dài một tài khoản dùng một lần
- **Bước:**
  1. Đổi sang mật khẩu hợp lệ theo chính sách ở từng độ dài.
- **Mong đợi:** 7 và 129 → 400; 8 và 128 → 200.
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PASSWORD-023 — A successful change returns a fresh session

- **Requirement:** REQ-PASSWORD-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** tài khoản dùng một lần
- **Kỹ thuật:** chuyển trạng thái (hợp lệ)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. Đổi mật khẩu.
  2. Gọi `GET /users/me` với access token trả về; đăng nhập bằng mật khẩu cũ và mới.
- **Mong đợi:** 200 kèm access + id token (`mustChangePassword: false`) và cookie
  `refreshToken` đã xoay vòng; token mới dùng được; mật khẩu cũ 401, mới 200.
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PASSWORD-024 — Change-password errors are translated

- **Requirement:** REQ-PASSWORD-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** tài khoản dùng một lần
- **Kỹ thuật:** đoán lỗi (Error Guessing — lộ key i18n)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. Submit mật khẩu hiện tại sai.
- **Mong đợi:** `message` là "Current password is incorrect". (Từng là
  BUG-PASSWORD-04, đã sửa 2026-10-15.)
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PASSWORD-025 — Change password is throttled after five attempts

- **Requirement:** REQ-PASSWORD-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** tài khoản dùng một lần
- **Kỹ thuật:** giá trị biên (BVA — lần thử 5 được phép / 6 bị chặn)
- **Tiền điều kiện:** `keepRateLimits: true`; key là ip + authId của tài khoản dùng một lần này
- **Bước:**
  1. Gửi sáu lần thử với current sai.
- **Mong đợi:** 1–5 → 400; 6 → 429. (Từng là `test.skip` trong spec cũ; key theo
  từng tài khoản cùng fixture rate-limit làm nó trở nên tất định.)
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PASSWORD-090 — Wrong-typed password fields are a validation error, never a 5xx

- **Requirement:** REQ-PASSWORD-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** tài khoản dùng một lần
- **Kỹ thuật:** đoán lỗi (Error Guessing — sai kiểu dữ liệu), bảo mật (không 5xx)
- **Tiền điều kiện:** một session của tài khoản dùng một lần (3 PATCH — dưới giới hạn 5)
- **Bước:**
  1. Gửi `currentPassword` là số; `newPassword` là mảng; body rỗng.
- **Mong đợi:** mỗi request → 400 `VALIDATION_ERROR`; mật khẩu ban đầu vẫn đăng nhập được.
- **Automated:** `tests/api/password/change-password.api.ts`

## Buộc đổi mật khẩu sau khi admin reset (REQ-PASSWORD-04, REQ-PASSWORD-05)

### TC-PASSWORD-030 — A must-change session is sent to /change-password and released after the change

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** session được mock
- **Kỹ thuật:** chuyển trạng thái (must-change → đã đổi)
- **Tiền điều kiện:** token refresh được mock với `mustChangePassword: true`; PATCH được mock trả 200
- **Bước:**
  1. Mở `/`.
  2. Điền form, submit.
- **Mong đợi:** bị redirect tới `/change-password` ("Set a new password"),
  "You must set a new password before continuing." được thông báo; sau khi submit,
  toast thành công và về HOME.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-031 — Signed-out visitors cannot open /change-password

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing)
- **Tiền điều kiện:** storage state rỗng
- **Bước:**
  1. Mở `/change-password`.
- **Mong đợi:** `/login`.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-032 — Forced-change form blocks invalid input before the API

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** session được mock
- **Kỹ thuật:** phân vùng tương đương (confirm không khớp; new rỗng / thiếu chữ hoa / thiếu chữ thường / thiếu số / thiếu ký tự đặc biệt; mật khẩu tạm rỗng)
- **Tiền điều kiện:** session must-change ở `/change-password`
- **Bước:**
  1. Submit từng tổ hợp không hợp lệ.
- **Mong đợi:** ô vi phạm bị `aria-invalid`; không có PATCH.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-033 — Wrong temp password vs. invalid new password

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** session được mock
- **Kỹ thuật:** bảng quyết định (temp sai × new hợp lệ → server báo lỗi ở ô temp; temp đúng × new không hợp lệ → client chặn)
- **Tiền điều kiện:** PATCH được mock trả 400 wrong-current cho hàng đầu tiên
- **Bước:**
  1. Submit từng hàng.
- **Mong đợi:** hàng 1 "Current password is incorrect" ở ô temp; hàng 2 ô new không hợp lệ, không có PATCH.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-034 — A normal session cannot open /change-password

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** session được mock
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: không có cờ → màn hình buộc đổi)
- **Tiền điều kiện:** `mustChangePassword: false`
- **Bước:**
  1. Mở `/change-password`.
- **Mong đợi:** bị đưa về HOME.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-035 — Forced-change new-password length boundaries

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** session được mock
- **Kỹ thuật:** giá trị biên (BVA — 7 · 8 · 128 · 129)
- **Tiền điều kiện:** PATCH được mock trả 200 cho các độ dài được chấp nhận
- **Bước:**
  1. Submit từng độ dài.
- **Mong đợi:** 7 / 129 bị chặn ở client; 8 / 128 thành công.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-036 — The forced screen shows labels, never keys or claims

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** session được mock
- **Kỹ thuật:** đoán lỗi (Error Guessing — lộ key thô / claim)
- **Tiền điều kiện:** session must-change
- **Bước:**
  1. Mở `/change-password`.
- **Mong đợi:** các ô có label và nút submit; không có text `forceChangePassword.*`, không có "mustChangePassword", không có "true" trơ trọi.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-037 — The forced screen in English and Vietnamese

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** session được mock
- **Kỹ thuật:** phân vùng tương đương (locale en / vi)
- **Tiền điều kiện:** session must-change
- **Bước:**
  1. Mở `/` (en) và `/vi/change-password`.
- **Mong đợi:** en "Set a new password" / "Temporary password"; vi "Đặt mật khẩu
  mới", "Mật khẩu tạm", "Xác nhận mật khẩu mới"; không có key thô.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-038 — Forced-change server failure and in-flight state

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** session được mock
- **Kỹ thuật:** đoán lỗi (Error Guessing — 500, mạng chậm)
- **Tiền điều kiện:** PATCH được mock trả 500 / bị giữ lại
- **Bước:**
  1. Submit khi server trả 500; submit khi request bị giữ lại.
- **Mong đợi:** "Server error. Please try again later.", vẫn ở `/change-password`; trong lúc bị giữ, input và nút submit bị disable.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-039 — After the change the gate does not bounce back; one PATCH per submit

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** session được mock
- **Kỹ thuật:** chuyển trạng thái (hợp lệ), đoán lỗi (Error Guessing — submit hai lần)
- **Tiền điều kiện:** PATCH được mock trả 200 (có độ trễ cho hàng submit hai lần)
- **Bước:**
  1. Submit; chờ ở HOME.
  2. Submit rồi force-click thêm lần nữa.
- **Mong đợi:** vẫn ở HOME; đúng một PATCH.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-040 — The forced form works from the keyboard

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** session được mock
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** session must-change
- **Bước:**
  1. Tab qua các ô tới nút submit; nhấn Enter tại đó.
- **Mong đợi:** thứ tự focus temp → toggle → new → toggle → confirm → toggle → submit; Enter gửi đúng một PATCH và về HOME.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-041 — The gate applies to every role and every page

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** session được mock (claim admin và user)
- **Kỹ thuật:** bảng quyết định (vai trò admin / user × trang đích)
- **Tiền điều kiện:** `mustChangePassword: true`
- **Bước:**
  1. Với tư cách admin mở `/admin`; với tư cách user mở `/apps`, `/profile`, `/vi/favorites`.
- **Mong đợi:** mọi lần truy cập đều dừng ở `/change-password`.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PASSWORD-042 — Real admin reset: forced change with the emailed temp password

- **Requirement:** REQ-PASSWORD-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin (API) + tài khoản dùng một lần trên trình duyệt
- **Kỹ thuật:** chuyển trạng thái (active → reset/must-change → đã đổi)
- **Tiền điều kiện:** một tài khoản dùng một lần; mật khẩu tạm lấy từ email trong queue
- **Bước:**
  1. Admin reset tài khoản; đăng nhập bằng mật khẩu tạm; mở `/` và `/apps`.
  2. Nhập mật khẩu tạm và một mật khẩu mới; submit; mở `/apps`.
- **Mong đợi:** mật khẩu cũ 401; cả hai lần truy cập ở bước 1 đều dừng ở
  `/change-password`; sau khi đổi về HOME, rồi `/apps` mở được; mật khẩu mới
  đăng nhập được với `mustChangePassword: false`; mật khẩu tạm không còn dùng
  được.
- **Automated:** `tests/e2e/password/admin-reset.e2e.ts`

### TC-PASSWORD-043 — An admin reset signs out the user's existing sessions

- **Requirement:** REQ-PASSWORD-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: refresh bằng token từ trước khi reset)
- **Tiền điều kiện:** một tài khoản dùng một lần đã đăng nhập trước khi reset
- **Bước:**
  1. Admin reset tài khoản; refresh bằng cookie từ trước khi reset; đăng nhập bằng mật khẩu cũ.
- **Mong đợi:** refresh 403; mật khẩu cũ 401.
- **Automated:** `tests/api/password/admin-reset.api.ts`

### TC-PASSWORD-044 — Temp-password sessions carry mustChangePassword until changed

- **Requirement:** REQ-PASSWORD-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái
- **Tiền điều kiện:** một tài khoản dùng một lần đã bị reset
- **Bước:**
  1. Đăng nhập bằng mật khẩu tạm; đổi nó; đăng nhập lại.
- **Mong đợi:** idToken đầu tiên `mustChangePassword: true`; response của lần đổi
  và lần đăng nhập kế tiếp mang `false`; sau đó mật khẩu tạm bị từ chối.
- **Automated:** `tests/api/password/admin-reset.api.ts`

### TC-PASSWORD-045 — The API refuses a must-change session outside the change endpoint

- **Requirement:** REQ-PASSWORD-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (Error Guessing — vượt qua gate phía client)
- **Tiền điều kiện:** một session dùng mật khẩu tạm
- **Bước:**
  1. Gọi `GET /users/me/favorites` bằng session đó.
- **Mong đợi:** 403 `AUTH_PASSWORD_CHANGE_REQUIRED` — `authGuard` chỉ cho
  session mật khẩu tạm gọi change-password và logout. (Từng là BUG-PASSWORD-01,
  đã sửa 2026-10-15.)
- **Automated:** `tests/api/password/admin-reset.api.ts`

## Quên mật khẩu trên trình duyệt (REQ-PASSWORD-01, REQ-PASSWORD-02)

### TC-PASSWORD-050 — Recovery pages need an email in the URL

- **Requirement:** REQ-PASSWORD-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — thiếu query parameter)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/forgot-password`, `/forgot-password/otp`, `/forgot-password/reset?email=…` (không có token).
- **Mong đợi:** mỗi trang đều dừng ở `/login`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-051 — The options page lists the recovery methods

- **Requirement:** REQ-PASSWORD-01, REQ-PASSWORD-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** —
- **Tiền điều kiện:** `/forgot-password?email=…`
- **Bước:**
  1. Đọc trang; bấm "Change email".
- **Mong đợi:** "Password Recovery", email, các nút cho OTP, Magic Link,
  Contact administrator; 2FA hiện kèm "Unavailable" và không phải là nút;
  "Change email" dẫn tới `/login`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-052 — Recovery by one-time code

- **Requirement:** REQ-PASSWORD-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (lựa chọn → mã → mật khẩu mới → login)
- **Tiền điều kiện:** một tài khoản dùng một lần; mã được cài sau lần gửi thật
- **Bước:**
  1. Chọn "Send OTP via email"; nhập mã.
  2. Nhập mật khẩu mới hai lần; "Reset password".
- **Mong đợi:** `/forgot-password/otp` → `/forgot-password/reset?…&token=…` →
  "Password reset successfully! Redirecting to login..." → `/login`; mật khẩu
  mới đăng nhập được, mật khẩu cũ thì không.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-053 — A wrong code clears the boxes and says how many tries remain

- **Requirement:** REQ-PASSWORD-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (mã không hợp lệ)
- **Tiền điều kiện:** một tài khoản dùng một lần ở bước nhập mã
- **Bước:**
  1. Nhập `000000`.
- **Mong đợi:** verify trả 401; "Invalid OTP. 4 attempts remaining"; các ô trống; vẫn ở bước nhập mã.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-054 — The new-password form enforces the policy before the API

- **Requirement:** REQ-PASSWORD-01, REQ-PASSWORD-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương + giá trị biên (7 ký tự · thiếu chữ hoa · thiếu số · thiếu ký tự đặc biệt · không khớp)
- **Tiền điều kiện:** `/forgot-password/reset?email=…&token=…`
- **Bước:**
  1. Submit từng giá trị không hợp lệ.
- **Mong đợi:** message chính sách ("Password must be at least 8 characters",
  "Password must contain uppercase, lowercase, number and special character",
  "Passwords do not match"); không có POST `/reset`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-055 — Recovery by magic link

- **Requirement:** REQ-PASSWORD-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (lựa chọn → kiểm email → link → mật khẩu mới → login)
- **Tiền điều kiện:** một tài khoản dùng một lần; token của link được cài sau lần gửi thật;
  các lần gọi verify lặp lại được trả bằng response đầu tiên (hành vi mount một
  lần — xem TC-PASSWORD-063)
- **Bước:**
  1. Chọn "Send Magic Link"; mở `/forgot-password/reset?…&method=magic-link`.
  2. Nhập mật khẩu mới hai lần; "Reset password".
- **Mong đợi:** "Check your email"; form mở khoá sau khi verify; toast thành công, `/login`; mật khẩu mới đăng nhập được.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-056 — The link in the reset email opens the form

- **Requirement:** REQ-PASSWORD-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — đích của link)
- **Tiền điều kiện:** một tài khoản dùng một lần; link đọc từ email `MAGIC_LINK` trong queue
- **Bước:**
  1. Yêu cầu magic link; mở URL trong email.
- **Mong đợi:** "Set new password" — link trỏ tới `/forgot-password/reset`.
  (Từng là BUG-PASSWORD-02, đã sửa 2026-10-15.)
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-057 — An invalid or used link shows the expired message

- **Requirement:** REQ-PASSWORD-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: link chưa được cấp / đã dùng)
- **Tiền điều kiện:** một tài khoản dùng một lần, một token server chưa từng cấp
- **Bước:**
  1. Mở URL reset với `method=magic-link`.
- **Mong đợi:** "This link is invalid or has expired. Please request a new one."; không có nút reset.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-058 — Recovery screens in Vietnamese

- **Requirement:** REQ-PASSWORD-01, REQ-PASSWORD-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (locale vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/forgot-password?email=…` và `/vi/forgot-password/reset?…`.
- **Mong đợi:** "Khôi phục mật khẩu", "Gửi mã OTP qua email", "Gửi Magic Link";
  "Tạo mật khẩu mới", "Mật khẩu mới", "Xác nhận mật khẩu", "Đặt lại mật khẩu".
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-059 — A reset token the server no longer holds is refused in the UI

- **Requirement:** REQ-PASSWORD-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: reset token đã cũ)
- **Tiền điều kiện:** một tài khoản dùng một lần; một token đúng định dạng nhưng không tồn tại
- **Bước:**
  1. Submit một mật khẩu mới hợp lệ.
- **Mong đợi:** "Invalid or expired reset token. Please start over"; vẫn ở trang; mật khẩu cũ vẫn dùng được.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-060 — The code step shows the resend countdown and a way back

- **Requirement:** REQ-PASSWORD-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (cooldown)
- **Tiền điều kiện:** vừa gửi một mã
- **Bước:**
  1. Xem nút gửi lại; bấm "Try another method".
- **Mong đợi:** "Resend in Ns", bị disable; quay về trang lựa chọn.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-061 — "Forgot Password?" on the password step carries the email

- **Requirement:** REQ-PASSWORD-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** —
- **Tiền điều kiện:** `/login/password?email=…`
- **Bước:**
  1. Bấm "Forgot Password?".
- **Mong đợi:** `/forgot-password?email=<same email>`, "Password Recovery".
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-062 — The unavailable 2FA option is exposed as disabled

- **Requirement:** REQ-PASSWORD-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** trang lựa chọn
- **Bước:**
  1. Tìm card 2FA theo accessible name.
- **Mong đợi:** tên "Two-Factor Authentication (2FA) - Unavailable" kèm
  `aria-disabled="true"`. BUG-PASSWORD-05 (đã sửa 2026-10-15) — `FadeSlideLeft` từng làm rơi
  các prop aria.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-063 — Opening a magic link verifies it once

- **Requirement:** REQ-PASSWORD-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — mount effect không idempotent)
- **Tiền điều kiện:** một tài khoản dùng một lần có token link đã cài
- **Bước:**
  1. Mở URL reset; đếm số request `magic-link/verify`.
- **Mong đợi:** đúng một. BUG-PASSWORD-03 (đã sửa 2026-10-15) — verify từng chạy trong một mount effect không có guard;
  dưới StrictMode của bản build dev nó chạy hai lần.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-087 — A signed-in user is kept out of the recovery pages

- **Requirement:** REQ-PASSWORD-07
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (nhảy cóc: đã đăng nhập → trang của khách)
- **Tiền điều kiện:** phiên `user@test.com`
- **Bước:**
  1. Mở `/forgot-password?email=…`, `/forgot-password/otp?email=…`, `/forgot-password/magic-link?email=…`,
     `/forgot-password/reset?email=…&token=…`.
- **Mong đợi:** mỗi trang redirect về `/` mà không hiện "Password Recovery" hay "Set new password".
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-088 — Contact administrator opens the support form with the email filled in

- **Requirement:** REQ-PASSWORD-08
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** —
- **Tiền điều kiện:** `/forgot-password?email=<địa chỉ>`
- **Bước:**
  1. Bấm "Contact administrator".
- **Mong đợi:** dialog hỗ trợ mở; ô "Reply-to email" chứa đúng địa chỉ và sửa được; gợi ý "Email pre-filled — change
  it if needed." hiện. (Gửi form: TC-SUPPORT-030.)
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PASSWORD-089 — The magic-link step shows the resend countdown and a way back

- **Requirement:** REQ-PASSWORD-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (cooldown, quay lui)
- **Tiền điều kiện:** một tài khoản dùng một lần vừa được gửi link
- **Bước:**
  1. Xem nút gửi lại ở "Check your email"; bấm "Try another method".
- **Mong đợi:** "Resend in Ns", bị disable; quay về trang lựa chọn.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

## Quên mật khẩu — API (REQ-PASSWORD-01, REQ-PASSWORD-02, REQ-PASSWORD-05)

### TC-PASSWORD-070 — Sending a code does not reveal whether the account exists

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (email đã biết / không tồn tại)
- **Tiền điều kiện:** một tài khoản dùng một lần và một địa chỉ chưa đăng ký
- **Bước:**
  1. `POST /otp/send` cho từng địa chỉ.
- **Mong đợi:** cả hai 200 `{ success: true, expiresIn: 300, cooldown: 60 }`; chỉ tài khoản thật có mã được lưu.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-071 — A second send inside the cooldown is refused

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (cooldown)
- **Tiền điều kiện:** vừa gửi một mã
- **Bước:**
  1. Gửi lại.
- **Mong đợi:** 400 `FORGOT_PASSWORD_OTP_COOLDOWN`.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-072 — Malformed email and code are rejected

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương + giá trị biên (email thiếu / rỗng / sai định dạng; mã 5 · 7 chữ số, có chữ cái); tài khoản không tồn tại
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gửi từng giá trị tới `/otp/send` hoặc `/otp/verify`.
- **Mong đợi:** 400 `VALIDATION_ERROR`; mã đúng định dạng cho email không tồn tại → 401 `FORGOT_PASSWORD_AUTH_NOT_FOUND`.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-073 — Wrong codes count down and the fifth locks verification

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA — lần thử 4 / 5), chuyển trạng thái (mở → khoá)
- **Tiền điều kiện:** một tài khoản dùng một lần có mã đã cài
- **Bước:**
  1. Verify mã sai năm lần; rồi mã đúng.
- **Mong đợi:** lần 1–4 → 401 `FORGOT_PASSWORD_OTP_INVALID` với số lần còn lại
  4…1; lần 5 → 400 `FORGOT_PASSWORD_OTP_LOCKED`; sau đó mã đúng cũng bị từ chối vì đã khoá.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-074 — Code → reset token → new password

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (hợp lệ)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. Gửi, cài mã, verify; reset bằng token trả về.
- **Mong đợi:** reset token 128 ký tự hex; reset 200 `{ success: true }`; mật khẩu cũ 401, mới 200.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-075 — A verified code cannot be reused

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: verify một mã đã dùng)
- **Tiền điều kiện:** một mã đã được verify
- **Bước:**
  1. Verify lại cùng mã đó.
- **Mong đợi:** 401 `FORGOT_PASSWORD_OTP_INVALID`.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-076 — Reset rejects malformed input and a token of another account

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (mật khẩu yếu, token 127 ký tự, token không phải hex), đoán lỗi (Error Guessing — dùng lại token giữa các email)
- **Tiền điều kiện:** hai tài khoản dùng một lần cho hàng chéo tài khoản
- **Bước:**
  1. Gửi từng body sai định dạng; reset tài khoản B bằng token của tài khoản A.
- **Mong đợi:** sai định dạng → 400 `VALIDATION_ERROR`; chéo tài khoản → 401 và mật khẩu của B không đổi.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-077 — A consumed reset token cannot reset again

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: dùng lại token đã tiêu thụ)
- **Tiền điều kiện:** vừa reset xong
- **Bước:**
  1. Reset lại bằng cùng token và một mật khẩu khác.
- **Mong đợi:** 401 `FORGOT_PASSWORD_INVALID_RESET_TOKEN`; mật khẩu mới đầu tiên vẫn dùng được.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-078 — A reset signs out the account's other sessions

- **Requirement:** REQ-PASSWORD-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: refresh bằng token từ trước khi reset)
- **Tiền điều kiện:** một tài khoản dùng một lần đã đăng nhập trước khi reset
- **Bước:**
  1. Reset bằng mã; refresh bằng cookie từ trước khi reset.
- **Mong đợi:** 403 (trước khi reset là 200).
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-079 — A locked account gets the generic answer and no code

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin (khoá) + guest
- **Kỹ thuật:** phân vùng tương đương (tài khoản không active)
- **Tiền điều kiện:** một tài khoản dùng một lần bị admin khoá
- **Bước:**
  1. Gửi mã.
- **Mong đợi:** cùng body 200 như TC-PASSWORD-070; không có mã nào được lưu.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-080 — Magic link → reset token → new password; the link works once

- **Requirement:** REQ-PASSWORD-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (hợp lệ, rồi dùng lại không hợp lệ)
- **Tiền điều kiện:** một tài khoản dùng một lần; token của link đã cài
- **Bước:**
  1. Gửi; verify token; verify lại; reset bằng reset token.
- **Mong đợi:** gửi 200 `{ expiresIn: 900, cooldown: 60 }`; verify lần đầu 200
  kèm reset token; lần hai 401 `FORGOT_PASSWORD_MAGIC_LINK_INVALID`; reset 200, mật khẩu mới đăng nhập được.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-081 — Wrong or malformed link tokens and the link cooldown

- **Requirement:** REQ-PASSWORD-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (token sai, token 126 ký tự), chuyển trạng thái (cooldown)
- **Tiền điều kiện:** vừa gửi một link
- **Bước:**
  1. Verify một token 128-hex sai, một token 126 ký tự; gửi lại.
- **Mong đợi:** 401 `FORGOT_PASSWORD_MAGIC_LINK_INVALID`; 400; 400 `FORGOT_PASSWORD_MAGIC_LINK_COOLDOWN`.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-082 — Sending a magic link does not reveal whether the account exists

- **Requirement:** REQ-PASSWORD-06
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (+ admin để khoá)
- **Kỹ thuật:** phân vùng tương đương (tài khoản active / không tồn tại / bị khoá), bảo mật (dò tài khoản)
- **Tiền điều kiện:** một tài khoản dùng một lần active, một bị admin khoá, một địa chỉ chưa đăng ký
- **Bước:**
  1. `POST /magic-link/send` cho từng địa chỉ.
- **Mong đợi:** cả ba 200 cùng body `{ success: true, expiresIn: 900, cooldown: 60 }`; chỉ tài khoản active có link
  được lưu.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-083 — A recovery code or link can be sent at most three times per window

- **Requirement:** REQ-PASSWORD-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA — lần gửi 3 được / 4 bị chặn), chuyển trạng thái (cooldown hết)
- **Tiền điều kiện:** một tài khoản dùng một lần cho mỗi kênh; cooldown 60 s được bỏ qua bằng cách xoá key cooldown
  sau khi server đã đếm lần gửi
- **Bước:**
  1. Gửi mã ba lần (hết cooldown giữa các lần), rồi lần thứ tư.
  2. Lặp lại với magic link.
- **Mong đợi:** lần 1–3 → 200; lần 4 → 400 `FORGOT_PASSWORD_OTP_RESEND_LIMIT` / `FORGOT_PASSWORD_MAGIC_LINK_RESEND_LIMIT`
  với message "You have exceeded the maximum number of … resend attempts. Please try again later".
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-084 — Recovery code sends are limited to 5 per address in 15 minutes

- **Requirement:** REQ-PASSWORD-06
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA — request 5 / 6), phân vùng tương đương (cùng địa chỉ / địa chỉ khác)
- **Tiền điều kiện:** `keepRateLimits: true`; bộ đếm rate limit được xoá trước khi bắt đầu
- **Bước:**
  1. Sáu lần `otp/send` cho cùng một tài khoản; rồi một lần cho địa chỉ khác.
- **Mong đợi:** lần 1 → 200, lần 2–5 → 400 (cooldown), lần 6 → 429 `TOO_MANY_REQUESTS` "Too many requests. Please
  try again later"; địa chỉ khác → 200.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-085 — Reset new-password length boundaries on the server

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA — 7 · 8 · 128 · 129)
- **Tiền điều kiện:** mỗi độ dài một tài khoản dùng một lần với reset token thật
- **Bước:**
  1. `POST /reset` với mật khẩu hợp lệ theo chính sách ở từng độ dài.
- **Mong đợi:** 7 và 129 → 400 `VALIDATION_ERROR`, mật khẩu cũ vẫn dùng được; 8 và 128 → 200, mật khẩu mới đăng nhập
  được.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PASSWORD-086 — The recovery email is trimmed and case-insensitive

- **Requirement:** REQ-PASSWORD-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — khoảng trắng, viết HOA)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. Gửi mã cho `"  <EMAIL VIẾT HOA>  "`; verify bằng email viết HOA; reset bằng `" <EMAIL VIẾT HOA>"`.
- **Mong đợi:** mã được cấp cho chính tài khoản (key chữ thường); verify 200; reset 200; mật khẩu mới đăng nhập được.
- **Automated:** `tests/api/password/forgot-password.api.ts`
