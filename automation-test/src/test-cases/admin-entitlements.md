# ADMINENTITLEMENTS — test case

Trang admin `/admin/entitlements`: picker chọn user, ma trận user × app, lưu ngoại lệ, API entitlement và thông báo khi quyền truy cập thay đổi.
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/admin-entitlements.md

## Picker (tìm user, lọc theo role)

### TC-ADMINENTITLEMENTS-001 — The page shows its header, picker, Filters and the empty prompt

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (lần mở đầu tiên)
- **Tiền điều kiện:** session admin
- **Bước:**
  1. Mở `/admin/entitlements`.
- **Mong đợi:** heading "Entitlements", combobox "Search users…", nút "Filters", "No users selected".
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-002 — Focusing the search lists up to 6 users without typing

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (limit mặc định 6)
- **Tiền điều kiện:** user đã seed
- **Bước:**
  1. Bấm vào ô tìm kiếm.
- **Mong đợi:** một listbox có 1–6 option.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-003 — Without a session the page sends you to login

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không session → login)
- **Tiền điều kiện:** một context không có cookie
- **Bước:**
  1. Mở `/admin/entitlements`.
- **Mong đợi:** URL kết thúc bằng `/login`.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-004 — A non-admin can neither find users nor open the matrix

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (role user × tìm user / catalog app)
- **Tiền điều kiện:** session và token của user đã seed
- **Bước:**
  1. Mở trang với tư cách user.
  2. `GET /admin/apps` bằng token của user.
- **Mong đợi:** `/admin/users` trả 403; guard vai trò phía client đưa user ra khỏi trang nên picker không render và không liệt kê ai (không bao giờ có `admin@test.com`), không xuất hiện nút Edit hay cột ma trận; lời gọi catalog trả 403.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-005 — A search with no match says so

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (không khớp)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gõ `zzznomatch99999`.
- **Mong đợi:** "No users found".
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-006 — Typing filters the results

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (khớp một phần email)
- **Tiền điều kiện:** user đã seed
- **Bước:**
  1. Gõ `admin`.
- **Mong đợi:** có `admin@test.com`, không có `user@test.com`.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-007 — Clearing the query brings the default list back

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đã lọc → mặc định)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gõ `admin`, rồi xoá ô.
- **Mong đợi:** các option lại được liệt kê.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-008 — The Admin role filter keeps only admins

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (role = Admin × không có query)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Filters → Role → Admin; focus ô tìm kiếm.
- **Mong đợi:** có `admin@test.com`, không có `user@test.com`.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-009 — Picking a user adds a chip and reveals the matrix

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chưa chọn ai → chọn một)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tìm `admin`, chọn `admin@test.com`.
- **Mong đợi:** có control chip "Remove …", nút "Edit" của ma trận, và "No users selected" biến mất.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-010 — The picker renders in English and Vietnamese with no missing keys

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (locale en / vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/admin/entitlements` và `/vi/admin/entitlements`.
- **Mong đợi:** "Entitlements" + "Filters"; "Phân quyền truy cập" + "Bộ lọc"; không có key thô `[adminEntitlements.…]`.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMINENTITLEMENTS-011 — The search is an autocomplete combobox and Filters closes on Escape

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (a11y)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Đọc thuộc tính của ô tìm kiếm; mở Filters và nhấn Escape.
- **Mong đợi:** `aria-autocomplete="list"`; popover mở rồi đóng.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

## Ma trận

### TC-ADMINENTITLEMENTS-012 — A user with no override shows the role default

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (ô role cấp / ô role không cấp)
- **Tiền điều kiện:** đã chọn tài khoản throwaway, không có override
- **Bước:**
  1. Chọn tài khoản.
- **Mong đợi:** sáu tên app làm cột; 4 icon "Granted" và 2 icon "Not granted";
  không có marker ngoại lệ; không có checkbox khi chưa vào chế độ edit.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-013 — Cells and headers show readable values

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (boolean / enum thô)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Đọc ma trận.
- **Mong đợi:** không có chữ `true` / `false` / `ADMIN`; chip role hiện "Admin".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-014 — Edit reveals checkboxes; Save starts disabled with a reason

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (chế độ edit × không thay đổi)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Bấm Edit; hover vào Save.
- **Mong đợi:** mỗi app một checkbox (6), có Cancel; Save bị disable với tooltip "No changes to save.".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-015 — A change enables Save; undoing it or Cancel discards it

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (chế độ edit × một thay đổi), chuyển trạng thái (dirty → clean / cancelled)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Edit, bỏ tick Blog, tick lại.
  2. Bỏ tick Blog, Cancel.
- **Mong đợi:** Save được bật sau thay đổi và bị disable lại khi thay đổi được hoàn
  tác; sau Cancel không còn checkbox, 4 "Granted" và không có marker ngoại lệ.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-016 — A cell the role withholds is editable and previews the exception

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (ô role không cấp)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Edit; tick "Grant Analytics Dashboard to Matrix Tester".
- **Mong đợi:** checkbox được bật và chưa tick, chuyển sang tick, và xuất hiện một
  marker "Exception — granted beyond the role".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-017 — Granting beyond the role is saved as an exception

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (role không cấp × được cấp), chuyển trạng thái (xem → edit → đã lưu)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Edit, tick Operations Console, Save.
- **Mong đợi:** trở về chế độ xem; 5 "Granted" và một marker "granted beyond the role".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-018 — Grant-all ticks every app and toggles back

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (mặc định → tất cả → không gì)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Edit; "Grant all apps"; "Revoke all apps".
- **Mong đợi:** cả sáu được tick với 2 marker "granted beyond"; sau đó cả sáu
  bỏ tick với 4 marker "revoked despite the role".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-019 — The picker is locked while editing

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chế độ edit chặn đổi lựa chọn)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Bấm Edit.
- **Mong đợi:** ô tìm kiếm và "Remove Matrix Tester" bị disable.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-020 — The user column stays pinned

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (mép trái)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Đọc computed style của header User và ô trong dòng.
- **Mong đợi:** `position: sticky`, `left: 0px` trên cả hai.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-021 — The matrix waits for the app catalog

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đang tải → đã tải; catalog trễ 800 ms)
- **Tiền điều kiện:** `/admin/apps` bị làm trễ
- **Bước:**
  1. Chọn tài khoản throwaway.
- **Mong đợi:** không có nút Edit cho tới khi catalog về, sau đó nút xuất hiện.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-022 — The matrix and its exception markers render in English and Vietnamese

- **Requirement:** REQ-ADMINENTITLEMENTS-01, REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (locale en / vi)
- **Tiền điều kiện:** đã chọn `user2@test.com` (ngoại lệ đã seed)
- **Bước:**
  1. Mở trang ở từng locale.
- **Mong đợi:** "User" / mỗi chiều một marker ("Exception — revoked despite the
  role", "Exception — granted beyond the role"); "Chỉnh sửa" / "Người dùng" /
  "Ngoại lệ — bị thu hồi dù đủ vai trò", "Ngoại lệ — được cấp ngoài vai trò";
  không thiếu key.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-023 — Cells are named checkboxes that work from the keyboard

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (a11y)
- **Tiền điều kiện:** chế độ edit
- **Bước:**
  1. Khi đã chọn John Doe, đọc tên của mọi ô.
  2. Với tài khoản throwaway, focus "Grant Blog to Matrix Tester" và nhấn Space.
- **Mong đợi:** mỗi app một checkbox "Grant {app} to John Doe"; Space bỏ tick Blog và bật Save.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-024 — Entering edit, saving and cancelling are announced

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (live region cho screen reader)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Edit → thay đổi → Save; Edit → thay đổi → Cancel.
- **Mong đợi:** `#announcer` đọc "Editing app access.", "App access saved.", "Changes discarded.".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

## Trạng thái seed không tạo được và chọn nhiều user

### TC-ADMINENTITLEMENTS-025 — An empty app catalog shows "No apps found"

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (0 app, catalog stub thành `[]`)
- **Tiền điều kiện:** stub `/admin/apps`
- **Bước:**
  1. Chọn Test User.
- **Mong đợi:** "No apps found" / "There are no apps to manage yet." và không có checkbox.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### ~~TC-ADMINENTITLEMENTS-026 — A user eligible for no app cannot use grant-all~~ Removed (2026-10-10)

Kiểm soát truy cập đã làm mọi ô đều sửa được: grant-all tick mọi app bất kể
role (TC-ADMINENTITLEMENTS-018), nên không còn trạng thái "0 eligible" nữa.

### ~~TC-ADMINENTITLEMENTS-027 — Saved grants live only in the page~~ Removed (2026-10-10)

Quyền cấp giờ được API thật lưu lại; trường hợp ngược lại là TC-ADMINENTITLEMENTS-035.

### TC-ADMINENTITLEMENTS-028 — Several users get one row each, and removing a chip removes the row

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (1 → 2 → 1 → 0 user được chọn)
- **Tiền điều kiện:** `user@test.com`, `user2@test.com` đã seed
- **Bước:**
  1. Chọn cả hai; bỏ John Doe; bỏ Test User.
- **Mong đợi:** hai row header, rồi một (Test User) kèm `#announcer` "Removed John Doe.", rồi "No users selected".
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMINENTITLEMENTS-029 — More matches than the limit shows a refine hint

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (total > số hiện; stub `meta.total` = 25)
- **Tiền điều kiện:** stub total của `/admin/users`
- **Bước:**
  1. Gõ `test.com`.
- **Mong đợi:** "Showing N of 25 — refine your search", N = số option được liệt kê.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMINENTITLEMENTS-030 — A failing user search leaves the picker usable

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (stub `/admin/users` trả 500, sau đó khôi phục)
- **Tiền điều kiện:** stub
- **Bước:**
  1. Gõ `admin`; gỡ stub; gõ `user@test.com`.
- **Mong đợi:** khi đang lỗi thì không có option và trang vẫn nguyên vẹn; sau đó tìm thấy user.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMINENTITLEMENTS-031 — Regex and markup characters are searched literally

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (`.*`, `(`, `<b>x</b>`, `%`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gõ từng giá trị.
- **Mong đợi:** lần nào cũng "No users found"; markup không bao giờ được render thành HTML.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMINENTITLEMENTS-032 — A failed save keeps edit mode and shows an error

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (5xx khi lưu)
- **Tiền điều kiện:** stub `PATCH /admin/entitlements` trả 500
- **Bước:**
  1. Edit, bỏ tick Blog, Save.
- **Mong đợi:** toast "Something went wrong. Please try again."; Save vẫn hiện
  và thay đổi vẫn giữ nguyên; không có override nào được lưu.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-033 — Role filter and search must both match

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (role User × query khớp một admin / một user)
- **Tiền điều kiện:** một tài khoản throwaway riêng của test (role `user`) — địa chỉ của nó là duy nhất trong lượt chạy, nên
  tài khoản do spec khác tạo không bao giờ khớp từ khoá (Q6)
- **Bước:**
  1. Filters → Role → User; gõ `admin@test.com`, rồi địa chỉ của tài khoản throwaway; chờ response tìm kiếm của từng từ khoá.
- **Mong đợi:** "No users found"; sau đó địa chỉ của tài khoản throwaway được liệt kê.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

## Ngoại lệ được lưu, API và thông báo

### TC-ADMINENTITLEMENTS-034 — Seeded exceptions show in both directions with a marker

- **Requirement:** REQ-ADMINENTITLEMENTS-01, REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (override deny / allow)
- **Tiền điều kiện:** `user2@test.com` (deny Notes, allow Operations Console)
- **Bước:**
  1. Chọn John Doe; hover marker thu hồi.
- **Mong đợi:** 4 "Granted", 2 "Not granted", mỗi chiều một marker; tooltip
  hiện "Exception — revoked despite the role".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-035 — Revoking a role-granted app survives a reload as an exception

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (role cấp × bị thu hồi), chuyển trạng thái (đã lưu → reload)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Edit, bỏ tick Blog, Save; reload và chọn lại tài khoản.
- **Mong đợi:** 3 "Granted" và một marker "revoked despite the role", cả trước và sau reload.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-036 — Setting a cell back to the role default removes the override

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (mặc định → deny → mặc định)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Thu hồi Blog và lưu; tick lại và lưu.
- **Mong đợi:** marker biến mất và API không giữ override nào cho tài khoản
  (không có `allow` thừa).
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-037 — A double-clicked Save sends one request

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (submit hai lần)
- **Tiền điều kiện:** đã chọn tài khoản throwaway; ghi lại các request PATCH
- **Bước:**
  1. Edit, bỏ tick Notes, double-click Save.
- **Mong đợi:** đúng một PATCH; một marker "revoked".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-038 — A non-admin gets 403 from the entitlement API

- **Requirement:** REQ-ADMINENTITLEMENTS-03, REQ-AUTHZ-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (role user × đọc / ghi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /admin/entitlements?userIds=…` và `PATCH /admin/entitlements` bằng token của user.
- **Mong đợi:** cả hai trả 403.
- **Automated:** `tests/api/admin-entitlements/entitlements.api.ts`

### TC-ADMINENTITLEMENTS-039 — The entitlement API requires a session

- **Requirement:** REQ-ADMINENTITLEMENTS-03, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (không token)
- **Tiền điều kiện:** không có
- **Bước:**
  1. GET và PATCH không kèm token.
- **Mong đợi:** cả hai trả 401.
- **Automated:** `tests/api/admin-entitlements/entitlements.api.ts`

### TC-ADMINENTITLEMENTS-040 — Revoking and restoring an app notifies the user both times

- **Requirement:** REQ-ADMINENTITLEMENTS-04, REQ-NOTIFICATIONS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** throwaway user (+ admin API)
- **Kỹ thuật:** chuyển trạng thái (được cấp → bị thu hồi → được cấp)
- **Tiền điều kiện:** tài khoản throwaway ở role mặc định
- **Bước:**
  1. Thu hồi Notes; xoá override; mở `/notifications`.
- **Mong đợi:** một ENTITLEMENT_REVOKED mới, rồi ENTITLEMENT_GRANTED, cho Notes;
  trang hiện "You no longer have access to Notes." và một link "You can now
  open Notes." tới `/apps?search=Notes`.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-ADMINENTITLEMENTS-041 — Saving the value the user already has sends nothing

- **Requirement:** REQ-ADMINENTITLEMENTS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** throwaway user (+ admin API)
- **Kỹ thuật:** bảng quyết định (đã cấp × cấp, không cấp × thu hồi)
- **Tiền điều kiện:** tài khoản throwaway ở role mặc định
- **Bước:**
  1. Cấp Notes (vốn đã được cấp); thu hồi Operations Console (vốn đã không được cấp); chờ 2 s.
- **Mong đợi:** không có dòng ENTITLEMENT\_\* mới nào cho cả hai app.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

## Bổ sung 2026-10-14

### TC-ADMINENTITLEMENTS-042 — A successful save is confirmed with a toast

- **Requirement:** REQ-ADMINENTITLEMENTS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (edit → đã lưu)
- **Tiền điều kiện:** đã chọn tài khoản throwaway
- **Bước:**
  1. Edit, bỏ tick Blog, Save.
- **Mong đợi:** toast "Access updated." và trang trở về chế độ xem.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMINENTITLEMENTS-043 — Picking a selected user again deselects it

- **Requirement:** REQ-ADMINENTITLEMENTS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đã chọn → bỏ chọn qua chính option), đoán lỗi (chọn trùng)
- **Tiền điều kiện:** `user2@test.com` đã seed
- **Bước:**
  1. Tìm `user2@test.com`, chọn John Doe; mở lại kết quả, bấm lại option của John Doe.
- **Mong đợi:** option được đánh dấu đã chọn (`aria-selected="true"`) trong lần mở thứ hai; bấm lại thì chip "Remove John Doe"
  biến mất, `#announcer` đọc "Removed John Doe." và "No users selected" hiện lại — không bao giờ có hai dòng cho cùng một user.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMINENTITLEMENTS-044 — The matrix API returns each user's effective access in the requested order

- **Requirement:** REQ-ADMINENTITLEMENTS-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (user không override / user có override cả hai chiều / admin)
- **Tiền điều kiện:** `user2@test.com`, `admin@test.com`, `user@test.com` đã seed (chỉ đọc)
- **Bước:**
  1. `GET /admin/entitlements?userIds=<user2>,<admin>,<user>`.
- **Mong đợi:** 200; `users` theo đúng thứ tự gửi lên. John Doe: có Operations Console, không có Notes, `overriddenAppIds` =
  {Notes, Operations Console}. Admin: `grantedAppIds` = toàn bộ catalog (`GET /admin/apps`), không override. Test User: có
  Blog, IDMS Portal, Team Calendar (inactive vẫn được tính), Notes; không có Analytics Dashboard, Operations Console; không
  override.
- **Automated:** `tests/api/admin-entitlements/entitlements.api.ts`

### TC-ADMINENTITLEMENTS-045 — Unknown user or app ids are refused with 404 and nothing is written

- **Requirement:** REQ-ADMINENTITLEMENTS-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (ObjectId hợp lệ nhưng không tồn tại), bảng quyết định (user lạ / app lạ ở cuối lô)
- **Tiền điều kiện:** tài khoản throwaway, không có override
- **Bước:**
  1. `GET` với một user id không tồn tại.
  2. `PATCH` một lô: thu hồi Blog của tài khoản throwaway + một thay đổi trỏ app không tồn tại.
  3. `PATCH` một thay đổi trỏ user không tồn tại.
  4. `GET` tài khoản throwaway.
- **Mong đợi:** (1) và (3) 404 `ENTITLEMENT_USER_NOT_FOUND` "One or more users no longer exist."; (2) 404
  `ENTITLEMENT_APP_NOT_FOUND` "One or more apps no longer exist."; (4) vẫn không có override nào — Blog chưa bị ghi.
- **Automated:** `tests/api/admin-entitlements/entitlements.api.ts`

### TC-ADMINENTITLEMENTS-046 — Saving the same change twice keeps one exception and answers the matrix shape

- **Requirement:** REQ-ADMINENTITLEMENTS-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (gửi lại cùng request), chuyển trạng thái (mặc định → deny → deny)
- **Tiền điều kiện:** tài khoản throwaway, không có override
- **Bước:**
  1. `PATCH` thu hồi Notes; gửi lại đúng body đó; `GET` tài khoản.
- **Mong đợi:** cả hai `PATCH` trả 200 với `data.users` = một dòng của tài khoản (không có Notes trong `grantedAppIds`,
  `overriddenAppIds` = [Notes]); hai response và `GET` giống hệt nhau.
- **Automated:** `tests/api/admin-entitlements/entitlements.api.ts`

### TC-ADMINENTITLEMENTS-047 — Entitlement saves are limited to 60 a minute

- **Requirement:** REQ-ADMINENTITLEMENTS-07
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (request thứ 60 / 61 trong cửa sổ 60 s)
- **Tiền điều kiện:** bộ đếm `rate-limit:entitlement-mutation:*` được xoá trước và sau test (`keepRateLimits`)
- **Bước:**
  1. Gửi 60 `PATCH` với body không hợp lệ `{ "changes": [] }` (limiter chạy trước validation, nên không ghi gì — Q7).
  2. Gửi request thứ 61.
- **Mong đợi:** 60 request đầu trả 400; request thứ 61 trả 429 `TOO_MANY_REQUESTS` "Too many requests. Please try again later".
- **Automated:** `tests/api/admin-entitlements/rate-limit.api.ts`

### TC-ADMINENTITLEMENTS-048 — Changing access to an inactive app sends no notification

- **Requirement:** REQ-ADMINENTITLEMENTS-08, REQ-ADMINENTITLEMENTS-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** throwaway user (+ admin API)
- **Kỹ thuật:** bảng quyết định (app active × inactive trong cùng một lần lưu)
- **Tiền điều kiện:** tài khoản throwaway ở role mặc định; Team Calendar đang inactive (seed)
- **Bước:**
  1. Một `PATCH` thu hồi cả Team Calendar và Notes.
  2. Chờ thông báo ENTITLEMENT_REVOKED của Notes tới hộp thư của tài khoản.
- **Mong đợi:** override của Team Calendar được lưu (quyền thực tế đã đảo) nhưng không có dòng ENTITLEMENT\_\* nào cho Team
  Calendar; Notes có đúng một ENTITLEMENT_REVOKED.
- **Automated:** `tests/api/admin-entitlements/notifications.api.ts`
