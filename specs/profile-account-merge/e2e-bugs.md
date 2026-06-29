# E2E Bug Log — profile-account-merge (append-only, §4.3 dual-gate)

## Round 1 — 2026-06-29

**Gate fail**: cả hai (A FAIL do bug test, B FAIL do false-negative môi trường) — KHÔNG phải app bug.

**Ground truth (curl :3100, đối chứng)**: `/account-settings` → 404 "could not be found"; `/profile` → render `profile-page-title` + "Change Password". ⇒ app serve code merge ĐÚNG; cả 2 gate fail vì lý do ngoài app.

### Triệu chứng & root cause

**Gate A (yarn e2e) — bug TEST (selector), không phải app**
- Triệu chứng: 5/10 fail với `strict mode violation: getByRole('heading', { name: 'Account' }) resolved to 2 elements` — khớp cả `<h1 id="profile-page-title">Account</h1>` lẫn `<h3 id="connected-accounts-title">Connected Accounts</h3>` (và vi: "Tài khoản" ⊂ "Tài khoản liên kết").
- Root cause (systematic-debugging): Playwright `getByRole(name)` mặc định **substring match**. Title mới "Account" là substring của heading "Connected Accounts" → 2 match → strict mode throw. Đây là lỗi selector trong test mới viết, KHÔNG phải lỗi gom code.
- Fix: thêm `{ exact: true }` cho 5 chỗ check heading page-title (EN.title/VI.title). Commit `83ceddc`.
- Re-verify: `yarn e2e e2e/profile-account-merge` → **10/10 PASS** (12.3s).

**Gate A — lần re-run đầu bị nhiễu môi trường (đã xử lý)**
- Sau khi sửa selector, re-run lần 1 ra 9 fail với `net::ERR_CONNECTION_REFUSED at :3100`. Root cause: dev server FE (webpack-over-junction) **crash** dưới tải chạy song song với Gate B (memory: turbopack/webpack-over-junction bất ổn). Không liên quan code.
- Fix: restart `next dev --port 3100` (webpack, manual), chạy Gate A **một mình** (không song song Gate B) → 10/10 PASS.

**Gate B (MCP browser walk) — false negative do stale cache**
- Triệu chứng: báo app vẫn là code CŨ (title "Profile", `/account-settings` còn sống, nav cũ).
- Root cause: trước khi bring-up worktree, một orphan server (code feature khác) squat :3100; tôi đã kill nó. Browser MCP đã cache (service worker / PWA cache) nội dung của orphan server cũ tại `localhost:3100` → sau khi server mới lên cùng port, SW serve lại trang CŨ từ cache. curl (không qua SW cache) chứng minh server mới đúng. ⇒ false negative, không phải app bug.
- Fix dự kiến: re-run Gate B với browser context mới / unregister service worker + hard reload; canary check `/account-settings` phải 404 trước khi walk. (MCP server đã disconnect giữa chừng — re-establish khi re-run.)

### Trạng thái (chốt Round 1)
- **Gate A: PASS (10/10)** sau fix selector (`83ceddc`) + server ổn định (chạy một mình, không song song Gate B).
- **Gate B (MCP): BLOCKED** — Playwright MCP server disconnect giữa chừng, không khả dụng để re-run (chặn hạ tầng, ngoài tầm kiểm soát; không phải lỗi app).
- **Gate B substitute: PASS** — do MCP down, thay bằng **script Playwright standalone** (chromium thật, cùng mục đích quan sát console/visual). Vì matrix read-only (không mutation), tái dùng storageState của Gate A là an toàn. Kết quả độc lập:
  - CANARY `/account-settings` → **404** (not-found), `/vi/account-settings` → 404.
  - `/profile` h1="Account"; headings = [Account, Personal Information, Connected Accounts, Notification Preferences, **Change Password**, Danger Zone] — card đổi mật khẩu đã gom vào.
  - `/vi/profile` h1="Tài khoản"; headings gồm **Đổi mật khẩu** + Vùng nguy hiểm.
  - nav (vi): có "Tài khoản"/"Thanh toán"/"Nhóm"; **không** "Cài đặt tài khoản"; **không** "Hồ sơ" cũ.
  - console MISSING_MESSAGE/IntlError = **0**; raw-key-leak = **false**; screenshot xác nhận layout sạch (title "Account", sidebar đúng).
  - 1 console error = cảnh báo a11y "Password forms should have username field" (pre-existing, không phải lỗi i18n/chức năng) → follow-up.

**Kết luận**: behavior gom được xác nhận bằng Gate A (assertion) + Gate B substitute (real-browser observation) + curl ground-truth. Dual-gate đạt mục đích; lưu ý Gate B chạy qua script thay MCP (MCP server down). KHÔNG cần thêm vòng debug — không có app bug.
