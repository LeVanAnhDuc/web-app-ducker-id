# PROFILE — test case

Trang Account tại `/profile`: xem và sửa thông tin cá nhân (REQ-PROFILE-01…02), hồ sơ công khai `GET /users/:id`
(REQ-PROFILE-03) và giới hạn tần suất cập nhật (REQ-PROFILE-04).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/profile.md

## Trang Account (REQ-PROFILE-01)

### TC-PROFILE-001 — /profile shows the remaining sections in one page

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** —
- **Tiền điều kiện:** user seed
- **Bước:**
  1. Mở `/profile`.
- **Mong đợi:** heading "Account" và các section "Personal Information", "Change
  Password", "Danger Zone"; các section đã bỏ "Connected Accounts" và "Notification
  Preferences" không có.
- **Automated:** `tests/e2e/profile/account-page.e2e.ts`

### TC-PROFILE-002 — The page is titled "Account", not the old "Profile"

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** —
- **Tiền điều kiện:** user seed
- **Bước:**
  1. Mở `/profile`.
- **Mong đợi:** có heading "Account"; không có heading đúng bằng "Profile".
- **Automated:** `tests/e2e/profile/account-page.e2e.ts`

### TC-PROFILE-003 — Signed-out visitors are sent to /login

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi
- **Tiền điều kiện:** không có cookie
- **Bước:**
  1. Mở `/profile`.
- **Mong đợi:** `/login`.
- **Automated:** `tests/e2e/profile/account-page.e2e.ts`

### TC-PROFILE-004 — The page is fully translated in English and Vietnamese

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (locale en / vi), đoán lỗi (thiếu message)
- **Tiền điều kiện:** user seed
- **Bước:**
  1. Mở `/profile` và `/vi/profile`, thu thập lỗi console.
- **Mong đợi:** en "Account" / "Change Password"; vi "Tài khoản", "Đổi mật
  khẩu", "Vùng nguy hiểm"; không lộ key thô `account.*` / `profile.*`; không có
  `MISSING_MESSAGE` / `IntlError`.
- **Automated:** `tests/e2e/profile/account-page.e2e.ts`

### TC-PROFILE-005 — The old /account-settings route is gone

- **Requirement:** REQ-PROFILE-01, REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: route từng hợp lệ)
- **Tiền điều kiện:** user seed
- **Bước:**
  1. Mở `/account-settings` và `/vi/account-settings`.
- **Mong đợi:** trang not-found; không có heading "Change Password".
- **Automated:** `tests/e2e/profile/account-page.e2e.ts`

### TC-PROFILE-006 — The Settings nav links to Account and Billing only

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** —
- **Tiền điều kiện:** user seed
- **Bước:**
  1. Đọc nhóm Settings ở sidebar; bấm "Account".
- **Mong đợi:** có "Account" và "Billing", không có "Account Settings"; link mở `/profile`.
- **Automated:** `tests/e2e/profile/account-page.e2e.ts`

### TC-PROFILE-007 — The removed /security page leaves no route or link

- **Requirement:** REQ-PROFILE-01, REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: route đã bỏ)
- **Tiền điều kiện:** user seed
- **Bước:**
  1. Mở `/security` và `/vi/security`; đọc nav Settings trên `/profile`.
- **Mong đợi:** cả hai not-found; không có link Security; Danger Zone nằm trên `/profile`.
- **Automated:** `tests/e2e/profile/account-page.e2e.ts`

### TC-PROFILE-010 — Personal Information shows the stored profile

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway
- **Kỹ thuật:** —
- **Tiền điều kiện:** hồ sơ đặt là "Linh Tran Thi", `+84 90 123 4567`,
  "12 Ly Thai To, Hoan Kiem", 1990-03-15, female
- **Bước:**
  1. Mở `/profile`.
- **Mong đợi:** header hiện họ tên đầy đủ và email; First Name "Linh", Last
  Name "Tran Thi" (tách ở dấu cách đầu tiên); Phone, Address như đã lưu; Date
  of Birth "15/03/1990"; Gender "Female".
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-030 — GET /users/me returns the profile and nothing sensitive

- **Requirement:** REQ-PROFILE-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** —
- **Tiền điều kiện:** user seed
- **Bước:**
  1. `GET /users/me`.
- **Mong đợi:** đúng các trường `_id, fullName, email, phone, address, dateOfBirth,
gender, avatar, createdAt`; không có password, authId hay tokenVersion.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-031 — The profile endpoints need a session

- **Requirement:** REQ-PROFILE-01, REQ-PROFILE-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET` và `PATCH /users/me` khi không có token.
- **Mong đợi:** cả hai 401 (`AUTH_MISSING_TOKEN`).
- **Automated:** `tests/api/profile/profile.api.ts`

## Sửa hồ sơ (REQ-PROFILE-02)

### TC-PROFILE-011 — Editing every field saves and survives a reload

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway
- **Kỹ thuật:** chuyển trạng thái (đã lưu → đã sửa → đã lưu)
- **Tiền điều kiện:** hồ sơ của TC-PROFILE-010
- **Bước:**
  1. Đổi first/last name, phone, address, gõ ngày 20/07/1988, chọn "Male"; "Save Changes".
  2. Tải lại trang.
- **Mong đợi:** "Profile updated successfully"; sau khi tải lại mọi trường hiện
  giá trị mới; `GET /users/me` có `fullName` "Minh Nguyen Van", gender male, DOB 1988-07-20.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-012 — Save and Cancel follow the dirty state; Cancel restores

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** chuyển trạng thái (pristine → dirty → pristine)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Kiểm tra các nút; sửa first name; bấm Cancel.
- **Mong đợi:** cả hai bị disable khi pristine; Save bật khi dirty; Cancel đưa "Linh" trở lại và disable Save.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-013 — Phone accepts its characters up to 20

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** phân vùng tương đương (EP) (chữ cái / số có định dạng), giá trị biên (BVA) (20 · 21)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Lưu `abc-123`, 21 chữ số, 20 chữ số, `+84 (90) 123-4567`.
- **Mong đợi:** "Invalid phone number format"; "Phone number is too long"; hai giá trị cuối lưu được và được lưu đúng như đã gõ.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-014 — Address refuses markup and more than 500 characters

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** phân vùng tương đương (EP) (markup), giá trị biên (BVA) (500 · 501)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Lưu `<script>alert(1)</script>`, 501 và 500 ký tự.
- **Mong đợi:** "Address contains invalid characters"; "Address must not exceed 500 characters"; 500 lưu được.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-015 — An empty first name shows a translated message

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** phân vùng tương đương (EP) (rỗng), đoán lỗi (key thô)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Xoá First Name; Save.
- **Mong đợi:** trường bị đánh dấu không hợp lệ với thông báo đọc được.
- **Ghi chú:** **bug đã biết** — `common.validation` không có mục `firstName`/`lastName`,
  nên hiện key zod thô "required"; spec đánh dấu `test.fail`.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-016 — The date of birth is only taken inside 13–120 years

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** giá trị biên (BVA) (13 năm trừ một ngày · đúng 13 năm)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Gõ ngày cách đây 13 năm + 1 ngày; rồi đúng 13 năm trước; Save.
- **Mong đợi:** ngày đầu bị bỏ qua (form không dirty, Save bị disable); ngày thứ hai được nhận và lưu.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-017 — A user born 101–120 years ago can still edit the profile

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway đăng ký với DOB 110 năm trước
- **Kỹ thuật:** giá trị biên (BVA) (tuổi nằm giữa trần 100 năm của profile và trần 120 năm của sign-up)
- **Tiền điều kiện:** `createAccount({ dateOfBirth: 110 năm trước })` — sign-up chấp nhận
- **Bước:**
  1. Đổi first name; Save.
- **Mong đợi:** "Profile updated successfully".
- **Ghi chú:** **bug đã biết** — form luôn gửi lại dateOfBirth và cả zod lẫn Joi đều chặn
  ở 100 năm, nên lần lưu bị từ chối với "Date must be in the past and within 100 years"; spec đánh dấu `test.fail`.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-018 — Editing in Vietnamese

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** phân vùng tương đương (EP) (locale vi)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Mở `/vi/profile`; đổi địa chỉ; "Lưu thay đổi".
- **Mong đợi:** "Thông tin cá nhân", các trường "Họ" / "Tên" / "Số điện thoại" /
  "Địa chỉ" / "Giới tính" ("Nữ"), DOB "15/03/1990"; toast "Cập nhật hồ sơ thành công".
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-019 — Clearing the phone removes it

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** đoán lỗi (xoá trống một trường tuỳ chọn)
- **Tiền điều kiện:** hồ sơ đã lưu có số điện thoại
- **Bước:**
  1. Xoá trống Phone; Save.
- **Mong đợi:** thành công và `phone: null`.
- **Ghi chú:** **bug đã biết** — các trường tuỳ chọn để trống bị bỏ khỏi body PATCH, số
  điện thoại cũ được giữ và điền lại, vậy mà toast thành công vẫn hiện; spec đánh dấu `test.fail`.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-020 — The header shows the new name right after saving

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** đoán lỗi (dữ liệu dẫn xuất bị cũ)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Đổi First Name thành "Hoa"; Save.
- **Mong đợi:** header của hồ sơ hiện "Hoa Tran Thi".
- **Ghi chú:** **bug đã biết** — header đọc tên từ idToken, vốn không được cấp lại;
  nó giữ "Linh Tran Thi" cho tới lần refresh kế tiếp; spec đánh dấu `test.fail`.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-021 — A server failure keeps the edits

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** đoán lỗi (500)
- **Tiền điều kiện:** PATCH được mock trả 500
- **Bước:**
  1. Sửa; Save.
- **Mong đợi:** "Server error. Please try again later."; giá trị đã sửa vẫn nằm trong trường.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-047 — Double-clicking Save sends one update

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** đoán lỗi (double-click submit)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Sửa Address; double-click "Save Changes".
- **Mong đợi:** toast "Profile updated successfully"; trang gửi đúng **một** `PATCH /users/me`; địa chỉ mới được lưu.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-048 — After saving, Save and Cancel are disabled again

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** chuyển trạng thái (dirty → đang lưu → đã lưu = pristine)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. Sửa Address; Save; chờ toast thành công.
- **Mong đợi:** Save và Cancel lại bị disable (form coi giá trị vừa lưu là gốc mới); trường giữ giá trị mới.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-049 — First name takes 50 characters and blocks 51 with a translated message

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** giá trị biên (BVA) (50 · 51 — rule chỉ có ở client, server kiểm `fullName` ghép ≤ 100)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. First Name 50 ký tự; Save.
  2. First Name 51 ký tự; Save.
- **Mong đợi:** 50 lưu được (`fullName` = 50 ký tự + " Tran Thi"); 51 bị chặn ở client (trường `aria-invalid`, không
  gửi PATCH) với thông báo đọc được, không phải key thô "maxLength".
- **Ghi chú:** **bug đã biết** — cùng nguyên nhân với TC-PROFILE-015 (`common.validation` không có `firstName`);
  test 51 ký tự đánh dấu `test.fail` (BUG-PROFILE-04).
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-050 — A first name the server refuses keeps the edits and saves nothing

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** đoán lỗi (input client cho qua nhưng server chặn — zod không có rule ký tự cho First Name)
- **Tiền điều kiện:** hồ sơ đã lưu
- **Bước:**
  1. First Name "Linh2"; Save.
- **Mong đợi:** toast "Validation failed" (`common:errors.validationFailed` của server); trường vẫn là "Linh2";
  `GET /users/me` vẫn trả "Linh Tran Thi".
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-032 — PATCH saves every editable field

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway
- **Kỹ thuật:** —
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH cả năm trường; GET.
- **Mong đợi:** 200 với giá trị mới (email không đổi); GET khớp.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-033 — fullName rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** giá trị biên (BVA) (1 · 2 · 100 · 101), phân vùng tương đương (EP) (chữ số, rỗng, dấu tiếng Việt)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH từng giá trị.
- **Mong đợi:** 2, 100 và "Nguyễn Thị Ánh" → 200; 1, 101, "John 2", "" → 400 trên `fullName`.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-034 — phone rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** giá trị biên (BVA) (0 · 1 · 20 · 21 ký tự), phân vùng tương đương (EP) (chữ cái, có định dạng)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH từng giá trị.
- **Mong đợi:** "" và 21 ký tự và chữ cái → 400 trên `phone`; 1, 20 và "+84 (90) 123-4567" → 200.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-035 — address rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** giá trị biên (BVA) (500 · 501), phân vùng tương đương (EP) (markup, dấu câu của địa chỉ)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH từng giá trị.
- **Mong đợi:** 500 và "12/3B, Le Loi St. #4" → 200; 501 và `<script>` → 400 trên `address`.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-036 — dateOfBirth rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** giá trị biên (BVA) (ngày mai, 99 / 101 năm trước), phân vùng tương đương (EP) (không phải ISO)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH từng giá trị.
- **Mong đợi:** ngày mai, 101 năm, "15/03/1990" → 400 trên `dateOfBirth`; 99 và 30 năm → 200.
- **Ghi chú:** quan sát từ schema, không assert: khác với mức tối thiểu 13 năm của
  sign-up, PATCH nhận bất kỳ ngày nào trong quá khứ.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-037 — gender rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** phân vùng tương đương (EP) (bốn giá trị hợp lệ, một không hợp lệ)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH từng giá trị.
- **Mong đợi:** bốn giá trị → 200; "unknown" → 400 trên `gender`.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-038 — Non-profile fields in the body are ignored

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** throwaway
- **Kỹ thuật:** đoán lỗi (mass assignment)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH `fullName` kèm `email`, `roles`, `password`.
- **Mong đợi:** 200; email không đổi; mật khẩu cũ vẫn đăng nhập được còn mật khẩu chèn vào thì không.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-039 — Validation messages follow Accept-Language

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** phân vùng tương đương (EP) (en / vi)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH một số điện thoại không hợp lệ với `Accept-Language: en`, rồi `vi`.
- **Mong đợi:** cả hai 400 `VALIDATION_ERROR` với thông báo khác nhau, đã dịch (không lộ key `validation.*`).
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-040 — A date of birth accepted at sign-up is accepted again

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway đăng ký với DOB 110 năm trước
- **Kỹ thuật:** giá trị biên (BVA) (nằm giữa hai mức trần)
- **Tiền điều kiện:** `createAccount({ dateOfBirth: 110 năm trước })`
- **Bước:**
  1. PATCH chỉ tên; PATCH tên kèm dateOfBirth đã lưu.
- **Mong đợi:** cả hai 200.
- **Ghi chú:** **bug đã biết** — lần thứ hai trả 400 `date.tooOld`
  (sign-up cho 120 năm, profile 100); spec đánh dấu `test.fail`. Là nguyên nhân gốc
  của TC-PROFILE-017.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-044 — Wrong types and injection shapes are refused without a server error

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** đoán lỗi (sai kiểu, NoSQL operator, markup), bảo mật
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH `fullName: { "$ne": "" }`, `fullName: "<b>Linh</b>"`, `phone: 912345678` (số), `gender: ["male"]`.
- **Mong đợi:** mỗi lần 400 `VALIDATION_ERROR` trên đúng trường; không lần nào 5xx.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-045 — A whitespace-only full name is refused

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** đoán lỗi (chỉ khoảng trắng), giá trị biên (độ dài 3 ≥ min 2 nhưng không có chữ)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. PATCH `fullName: "   "`.
- **Mong đợi:** 400 `VALIDATION_ERROR` trên `fullName` (quyết định Q5).
- **Ghi chú:** **bug đã biết** — schema không trim và pattern cho phép `\s`, nên tên trống được lưu; spec đánh dấu
  `test.fail` (BUG-PROFILE-05).
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-046 — An empty update changes nothing

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** throwaway
- **Kỹ thuật:** phân vùng tương đương (EP) (body không có trường nào)
- **Tiền điều kiện:** một session của tài khoản dùng một lần
- **Bước:**
  1. GET; PATCH `{}`.
- **Mong đợi:** 200 và hồ sơ trả về giống hệt lần GET trước (quyết định Q8).
- **Automated:** `tests/api/profile/profile.api.ts`

## Hồ sơ công khai (REQ-PROFILE-03)

### TC-PROFILE-041 — GET /users/:id returns only the public profile

- **Requirement:** REQ-PROFILE-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** bảo mật (lộ dữ liệu cá nhân cho người không đăng nhập)
- **Tiền điều kiện:** `_id` của user seed (đọc qua `GET /users/me` của chính user đó)
- **Bước:**
  1. `GET /users/:id` không kèm token.
- **Mong đợi:** 200 với đúng các trường `_id, fullName, avatar, gender` (khớp hồ sơ); không có email, phone,
  address, dateOfBirth, password, authId hay roles.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-042 — GET /users/:id refuses a malformed id and answers 404 for an unknown one

- **Requirement:** REQ-PROFILE-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (id sai định dạng / đúng định dạng nhưng không tồn tại)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /users/not-an-object-id`; `GET /users/aaaaaaaaaaaaaaaaaaaaaaaa`.
- **Mong đợi:** 400 `VALIDATION_ERROR` với lỗi trường `id` "Invalid user ID format"; 404 `USER_NOT_FOUND`
  "User not found".
- **Automated:** `tests/api/profile/profile.api.ts`

## Giới hạn tần suất (REQ-PROFILE-04)

### TC-PROFILE-043 — Profile updates are throttled after ten requests

- **Requirement:** REQ-PROFILE-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** throwaway
- **Kỹ thuật:** giá trị biên (BVA) (lần 10 · lần 11), bảo mật (lạm dụng)
- **Tiền điều kiện:** bộ đếm rate limit sạch (`keepRateLimits` + xoá một lần trước khi đăng ký)
- **Bước:**
  1. PATCH hợp lệ 10 lần; PATCH lần thứ 11.
- **Mong đợi:** 10 lần đầu 200; lần 11 trả 429 `TOO_MANY_REQUESTS` "Too many requests. Please try again later".
- **Automated:** `tests/api/profile/profile.api.ts`
