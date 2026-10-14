# SETTINGS — test case

Ngôn ngữ, giao diện sáng/tối, định dạng ngày giờ, việc gỡ tính năng Team và đổi ngôn ngữ / giao diện khi chưa đăng nhập
(REQ-SETTINGS-01…05). Không có tầng API: cả bốn tính năng chỉ nằm ở client (URL, cookie, localStorage, `Intl`).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/settings.md

## Ngôn ngữ (REQ-SETTINGS-01)

### TC-SETTINGS-020 — Switching to Tiếng Việt moves to /vi and translates the page

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (en → vi)
- **Tiền điều kiện:** `/apps?search=idms`
- **Bước:**
  1. User menu → Language → "Tiếng Việt".
- **Mong đợi:** URL `/vi/apps?search=idms` (giữ query); nav "Trang chủ"; `<html lang="vi">`.
- **Automated:** `tests/e2e/settings/language.e2e.ts`

### TC-SETTINGS-021 — Switching back to English drops the prefix

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (vi → en)
- **Tiền điều kiện:** `/vi/apps`
- **Bước:**
  1. "Mở menu người dùng" → "Ngôn ngữ" → "English".
- **Mong đợi:** path `/apps` (không prefix); nav "Home"; `<html lang="en">`.
- **Automated:** `tests/e2e/settings/language.e2e.ts`

### TC-SETTINGS-022 — The active language is marked; picking it again is a no-op

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: en → en)
- **Tiền điều kiện:** `/apps`
- **Bước:**
  1. Mở submenu Language; chọn "English".
- **Mong đợi:** English `aria-checked="true"`, Tiếng Việt `false`; URL không đổi.
- **Automated:** `tests/e2e/settings/language.e2e.ts`

### TC-SETTINGS-023 — The switch is announced

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** `/apps`
- **Bước:**
  1. Chuyển sang Tiếng Việt.
- **Mong đợi:** live region đã thông báo "Language changed to Tiếng Việt.".
- **Automated:** `tests/e2e/settings/language.e2e.ts`

### TC-SETTINGS-039 — An unsupported locale prefix is not found

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (locale không hỗ trợ), đoán lỗi (Error Guessing — gõ tay prefix)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/fr/apps`.
- **Mong đợi:** trang not-found của Next, không crash, không rơi về tiếng Anh như thể `fr` hợp lệ.
- **Automated:** `tests/e2e/settings/language.e2e.ts`

## Giao diện (REQ-SETTINGS-02)

### TC-SETTINGS-030 — Dark is applied and persists

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (system → dark → reload / tab mới)
- **Tiền điều kiện:** giả lập OS scheme light
- **Bước:**
  1. User menu → Theme → Dark; reload; mở `/apps` ở tab thứ hai.
- **Mong đợi:** `<html class="… dark">` ở mọi lần.
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

### TC-SETTINGS-031 — Light overrides a dark OS preference

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (lựa chọn light × OS dark)
- **Tiền điều kiện:** giả lập OS scheme dark
- **Bước:**
  1. Theme → Light; reload.
- **Mong đợi:** class `light`, không bao giờ `dark`.
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

### TC-SETTINGS-032 — System follows the OS

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (lựa chọn system × OS dark / light)
- **Tiền điều kiện:** giả lập OS scheme dark, rồi light
- **Bước:**
  1. Theme → Dark, rồi → System; reload.
- **Mong đợi:** class trùng với OS scheme, cả trước và sau khi reload.
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

### TC-SETTINGS-033 — The theme submenu in Vietnamese

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (locale vi)
- **Tiền điều kiện:** `/vi`
- **Bước:**
  1. "Giao diện" → "Tối"; mở lại submenu.
- **Mong đợi:** class dark; "Tối" được chọn; có "Sáng" và "Theo hệ thống".
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

### TC-SETTINGS-040 — The theme change is announced

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** `/`
- **Bước:**
  1. Theme → Dark, rồi Theme → Light.
- **Mong đợi:** live region đã lần lượt thông báo "Switched to dark mode." và "Switched to light mode."
  (`common.userMenu.switchedToDark` / `switchedToLight`).
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

## Định dạng ngày giờ (REQ-SETTINGS-03)

### TC-SETTINGS-001 — A timestamp is a <time> element with ISO datetime and readable text

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (ISO hợp lệ)
- **Tiền điều kiện:** một dòng login-history bị intercept
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** `time[datetime]` với giá trị ISO; text không phải ISO, không phải "Invalid Date", không phải "—".
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-002 — Vietnamese dates use the Vietnamese month form

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (locale vi)
- **Tiền điều kiện:** một dòng bị intercept
- **Bước:**
  1. Mở `/vi/login-history`.
- **Mong đợi:** text chứa "thg"; datetime vẫn là ISO.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-003 — The same instant renders differently per locale

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (locale × định dạng)
- **Tiền điều kiện:** một dòng cố định bị intercept
- **Bước:**
  1. Đọc dòng đó trên `/login-history` và `/vi/login-history`.
- **Mong đợi:** hai text khác nhau.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-004 — Notifications show relative English times

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (biến thể tương đối)
- **Tiền điều kiện:** notification đã seed
- **Bước:**
  1. Mở `/notifications`.
- **Mong đợi:** text tương đối ("ago" / "minute" / …); không có chuỗi ISO.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-005 — Notifications show relative Vietnamese times

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (locale vi), đoán lỗi (Error Guessing — rò locale)
- **Tiền điều kiện:** notification đã seed
- **Bước:**
  1. Mở `/vi/notifications`.
- **Mong đợi:** có "trước"; không có "ago" tiếng Anh.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-006 — Invalid values never show "Invalid Date"

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (dòng hợp lệ; `createdAt` không parse được), đoán lỗi (Error Guessing)
- **Tiền điều kiện:** các dòng bị intercept, một dòng có `createdAt: "not-a-date"`
- **Bước:**
  1. Mở `/login-history`.
- **Mong đợi:** không có "Invalid Date" ở đâu cả; giá trị không parse được hiển thị "—".
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-007 — Every timestamp cell carries a machine-readable datetime

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** ba dòng bị intercept
- **Bước:**
  1. Mở `/login-history` và `/vi/login-history`.
- **Mong đợi:** ≥ 3 phần tử `time`, mỗi phần tử có `datetime` ISO không rỗng, ở cả hai locale.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-008 — Admin tables use the same format

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin (`adminPage`)
- **Kỹ thuật:** phân vùng tương đương (bề mặt admin × en / vi)
- **Tiền điều kiện:** user đã seed
- **Bước:**
  1. Mở `/admin/users` và `/vi/admin/users`.
- **Mong đợi:** `table time[datetime]` với giá trị ISO, text đọc được; bản vi chứa "thg".
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-009 — First load hydrates without a mismatch warning

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — server UTC so với múi giờ trình duyệt)
- **Tiền điều kiện:** một dòng bị intercept
- **Bước:**
  1. Mở `/login-history`, thu thập console error và warning.
- **Mong đợi:** không cái nào nhắc tới hydration / text mismatch.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-015 — Midnight UTC lands on the viewer's calendar day

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA — ranh giới ngày giữa các múi giờ)
- **Tiền điều kiện:** một dòng lúc `2026-01-01T00:00:00.000Z`; múi giờ trình duyệt Asia/Ho_Chi_Minh, rồi America/New_York
- **Bước:**
  1. Mở `/login-history` ở từng múi giờ.
- **Mong đợi:** "Jan 1, 2026…" ở Hồ Chí Minh, "Dec 31, 2025…" ở New York; `datetime` là ISO gốc ở cả hai.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-016 — Notification times are <time> elements

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** notification đã seed
- **Bước:**
  1. Mở `/notifications`; kiểm tra article đầu tiên.
- **Mong đợi:** một `time[datetime]`. **Bug đã biết** — thời gian tương đối là
  một `<span>` trơn (việc tiếp theo mà feature locale-time-format đã ghi nhận
  nhưng chưa bao giờ làm); spec đánh dấu `test.fail`.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-034 — The app language decides the date format, not the browser's

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (locale của app × locale của trình duyệt)
- **Tiền điều kiện:** một dòng login-history lúc `2026-06-29T08:04:00.000Z` bị intercept; múi giờ Asia/Ho_Chi_Minh
- **Bước:**
  1. Trình duyệt `vi-VN`, mở `/login-history`.
  2. Trình duyệt `en-US`, mở `/vi/login-history`.
- **Mong đợi:** bước 1 bắt đầu bằng "Jun 29, 2026" (tiếng Anh); bước 2 chứa "29 thg 6, 2026" (tiếng Việt).
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-035 — The datetime format shows the locale's date and clock style

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (locale en / vi), bảng quyết định (kiểu ngày × kiểu giờ)
- **Tiền điều kiện:** một dòng lúc `2026-06-29T08:04:00.000Z` bị intercept; múi giờ Asia/Ho_Chi_Minh (= 15:04 giờ địa phương)
- **Bước:**
  1. Mở `/login-history` và `/vi/login-history`.
- **Mong đợi:** en đúng "Jun 29, 2026, 3:04 PM" (đồng hồ 12 giờ); vi chứa "29 thg 6, 2026" và "15:04", không có
  AM/PM/SA/CH (đồng hồ 24 giờ). Thứ tự ngày–giờ của vi do ICU quyết (Q4).
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-036 — Relative notification times are localized at known ages

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA — dưới 1 phút), phân vùng tương đương (locale en / vi)
- **Tiền điều kiện:** list notification bị intercept: một dòng 10 giây trước, một dòng 2 giờ trước
- **Bước:**
  1. Mở `/notifications` và `/vi/notifications`.
- **Mong đợi:** en "less than a minute ago" và "about 2 hours ago"; vi "dưới 1 phút trước" và "khoảng 2 giờ trước"
  (date-fns `formatDistanceToNow`, Q8).
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-037 — Long dates spell out the month in each locale

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (biến thể `dateLong` × locale en / vi)
- **Tiền điều kiện:** list "My Requests" bị intercept với một yêu cầu lúc `2026-06-29T08:04:00.000Z`; múi giờ Asia/Ho_Chi_Minh
- **Bước:**
  1. Mở `/contacts/me` và `/vi/contacts/me`.
- **Mong đợi:** cột ngày là `time[datetime="2026-06-29T08:04:00.000Z"]` với text "June 29, 2026" (en) / "29 tháng 6, 2026" (vi).
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

## Tính năng đã gỡ (REQ-SETTINGS-04)

### TC-SETTINGS-010 — The Settings nav has no Team link

- **Requirement:** REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (locale en / vi)
- **Tiền điều kiện:** `/profile`, `/vi/profile`
- **Bước:**
  1. Đọc nhóm Settings.
- **Mong đợi:** có "Account" (vi "Tài khoản") và "Billing"; không có "Team" / "Nhóm".
- **Automated:** `tests/e2e/settings/team-removal.e2e.ts`

### TC-SETTINGS-011 — /team is not found

- **Requirement:** REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: route đã bị gỡ)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/team` và `/vi/team`.
- **Mong đợi:** trang not-found, không crash.
- **Automated:** `tests/e2e/settings/team-removal.e2e.ts`

### TC-SETTINGS-012 — No missing message or leaked team key after the removal

- **Requirement:** REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (Error Guessing — key i18n còn sót)
- **Tiền điều kiện:** `/profile`, `/vi/profile`
- **Bước:**
  1. Tải từng trang, thu thập console error.
- **Mong đợi:** không có `MISSING_MESSAGE` / `IntlError`; không có text `team.*`.
- **Automated:** `tests/e2e/settings/team-removal.e2e.ts`

### TC-SETTINGS-013 — The surviving Settings links stay keyboard-reachable

- **Requirement:** REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng tiếp cận (accessibility)
- **Tiền điều kiện:** `/profile`
- **Bước:**
  1. Focus vào link "Account".
- **Mong đợi:** link nhận được focus.
- **Automated:** `tests/e2e/settings/team-removal.e2e.ts`

## Khi chưa đăng nhập (REQ-SETTINGS-05)

### TC-SETTINGS-038 — A guest can switch the language on the sign-in screen

- **Requirement:** REQ-SETTINGS-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (vai trò guest)
- **Tiền điều kiện:** `/login`, chưa đăng nhập
- **Bước:**
  1. User menu → Language → "Tiếng Việt".
- **Mong đợi:** path `/vi/login`; heading đăng nhập tiếng Việt (`login.form.titleWelcome` vi); `<html lang="vi">`.
- **Automated:** `tests/e2e/settings/language.e2e.ts`

### TC-SETTINGS-041 — A guest's theme choice applies on the sign-in screen

- **Requirement:** REQ-SETTINGS-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (vai trò guest), chuyển trạng thái (system → dark → reload)
- **Tiền điều kiện:** `/login`, chưa đăng nhập, giả lập OS scheme light
- **Bước:**
  1. User menu → Theme → Dark; reload.
- **Mong đợi:** `<html class="… dark">` trước và sau reload.
- **Automated:** `tests/e2e/settings/theme.e2e.ts`
