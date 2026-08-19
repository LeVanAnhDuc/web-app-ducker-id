# E2E bug log — admin-entitlements-matrix

Append-only. 1 entry per dual-gate fail round (§4.3, max 3 rounds).

## Round 1 — 2026-07-16

- **Gate fail:** A (`yarn e2e`). Gate B (MCP walk) PASS.
- **Kết quả:** 18 passed, **13 failed**, 2 skipped.
- **Scenario fail:** toàn bộ matrix test cần click vào control matrix sau khi chọn user (edit-mode/dirty, save, check-all, picker-lock, sticky, i18n en+vi, a11y, live-region enter-edit/save/cancel). Test "happy render" + "data rendering" + AuthN + picker suite (reconciled) PASS.
- **Triệu chứng:** click `editButton` (và control matrix đầu tiên) fail — Playwright: `<button role="option" ... from <div data-radix-popper-content-wrapper> subtree intercepts pointer events`, retry tới timeout.
- **Root cause (systematic-debugging):** helper `selectUserByEmail` chọn user xong **không đóng popover kết quả** của multi-select picker. Popover (Radix popper) giữ mở (đúng behavior app — cho chọn nhiều user), overlay đè lên vùng matrix bên dưới → chặn pointer click nút Edit. **Đây là lỗi test-harness, KHÔNG phải bug app** — gate B (MCP) pass vì thao tác thật làm popover đóng tự nhiên.
- **Fix đã làm:** `client/e2e/admin-entitlements/matrix.e2e.ts` — thêm vào `selectUserByEmail`: sau khi click option → `page.keyboard.press("Escape")` + `expect(getByRole("listbox")).toHaveCount(0)` để đảm bảo popover đóng trước khi tương tác matrix. Không đụng app code.
- **Kèm theo (finding gate B, đã fix cùng round):** `handleCancel` trong `AdminEntitlementsMatrix` thiếu `announce(tAnnounce("canceled"))` (key `announce.canceled` chết, trái design §6 a11y) → đã thêm; bổ sung test "live region announces cancel".
- **Kết quả re-verify:** sau fix helper còn **5 fail** phụ (đều test-harness, không phải bug app): (a) hover tooltip trên Save `disabled` (`pointer-events:none`) timeout → hover `{ force: true }` (trigger là span bọc); (b) `getByRole("img",{name:"Granted"})` khớp cả "Not granted" (substring) → `exact:true`; (c) `getByRole("columnheader",{name:"User"/"Người dùng"})` khớp 5 (RoleChip user-role trong header app) → `exact:true`; (d) VI locale: `pickerSearch` regex EN không khớp aria-label VI → regex `/Search users|Tìm người dùng/i`. Fix xong → **gate A full "Admin Entitlements": 31 passed, 2 skipped, 0 failed**. Gate B: PASS. **Dual-gate §4.3 đạt (1 vòng fix).**
