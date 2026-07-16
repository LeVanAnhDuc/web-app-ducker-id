# E2E — AdminEntitlements user×app matrix (rows = user)

Test file: `client/e2e/admin-entitlements/matrix.e2e.ts` (project `admin`, storageState `admin.json`).
Scope: the rows=user × cols=app entitlement matrix (edit/save/cancel, dirty tracking, sticky user column, check-all). Picker/search/role-filter is already covered by `picker.e2e.ts` — not duplicated here (see design.md §7 row 7).

**Data**: app catalog (`/admin/apps`) and user search (`/admin/users`) are REAL backend, seeded (`server/src/database/seeders/data/{users,web-apps}.ts`). Entitlement grants are **mock, in-memory JS module state** (reset per browser navigation) keyed by the mock's own fake ids — they never match real backend ids, so every real selected user starts with all eligible cells "not granted" → deterministic baseline, no revert needed. Row fixture: `user@test.com` / "Test User" (role `user`). Eligibility is exact-role-match (not hierarchical): eligible = Blog, IDMS Portal, Team Calendar, Notes; ineligible = Analytics Dashboard, Operations Console (both `requiredRoles=[admin]`).

## Scenarios (từ design.md `## E2E Scenario Matrix`)

| # | Nhóm | Test | Trạng thái |
| - | ---- | ---- | ---------- |
| 1 | Happy | chọn user → cols = toàn bộ 6 app catalog; non-edit hiện icon đúng (4 "Not granted" + 2 "Role required"); không có checkbox | ✅ |
| 2 | AuthN | unauth → redirect `/login` | ✅ |
| 3 | AuthZ | non-admin denial | ⏸ defer (`test.fixme`) — cần non-admin storageState project; `admin-authz/` đã phủ /admin/* denial |
| 4 | Validation/expected-error | **[DT]** Edit + chưa đổi → Save disabled + tooltip "No changes to save." | ✅ |
| 4 | Validation/expected-error | **[DT]** Edit + đổi 1 ô eligible → Save enabled; Cancel → revert về "Not granted" cũ | ✅ |
| 4 | Validation/expected-error | ô `!eligible` (Analytics Dashboard cho "Test User") → checkbox disabled + tooltip "This user lacks the required role." | ✅ |
| 5 | Empty/null | Chưa chọn user → "No users selected" | — (đã phủ ở `picker.e2e.ts`, không lặp) |
| 5 | Empty/null | App catalog rỗng → `EntitlementMatrixEmpty` | ⏸ defer — backend seed luôn có 6 app đã seed, không reproducible qua E2E mà không seed riêng |
| 5 | Empty/null | app `iconUrl=null` → fallback icon không vỡ | ✅ (implicit) — cả 6 app seed đều `iconUrl:null`; mọi test render header đã tự phủ case này |
| 6 | Boundary | **[BVA]** cột user sticky (`position:sticky` + `left:0px`) qua header + row cell | ✅ (gate A: assert CSS class/computed style; xem note gate B bên dưới) |
| 6 | Boundary | eligibleCount ≥1 → nút check-all enabled + toggle cả 2 chiều | ✅ |
| 6 | Boundary | eligibleCount = 0 → nút check-all disabled | ⏸ defer — mọi user seed có role `user`/`admin`, mọi app seed yêu cầu `user` hoặc `admin` → luôn có overlap ≥1, không có user/app kết hợp nào cho ra 0 eligible với seed hiện tại |
| 7 | Filter/search | N/A trong matrix (matrix không có filter riêng) | N/A — đã phủ ở `picker.e2e.ts` |
| 8 | Data rendering | cell hiện icon (Check/X/Minus) không phải raw `true/false`; header hiện `displayName` + `RoleChip` dịch, không raw enum (`"ADMIN"`) | ✅ |
| 9 | i18n | EN: Edit/User column render, không key thiếu | ✅ |
| 9 | i18n | VI: Chỉnh sửa/Người dùng render, không key thiếu | ✅ |
| 10 | Error/loading | Đang tải catalog → toolbar/table chưa render (loading gate); sau khi resolve → Edit hiện | ✅ (route-intercept delay `/admin/apps` 800ms) |
| 10 | Error/loading | Mock `updateUserGrants` lỗi → toast error + không thoát edit | ⏸ defer — mock luôn success, không có nhánh lỗi để trigger mà không sửa mock/app code (out of scope Task 11); verify sâu khi BE thật (slice sau) |
| 11 | Mutation safety | **[ST]** enter-edit → toggle → **Save** → thoát edit + icon phản ánh đúng (1 "Granted", 3 "Not granted", 2 "Role required") | ✅ (**A only** — mutation-heavy) |
| 11 | Mutation safety | Cancel sau khi đổi → revert, không mutate | ✅ (đã phủ chung với case #4 dirty→cancel) |
| 12 | a11y | checkbox có `aria-label` "Grant {app} to {user}" | ✅ |
| 12 | a11y | Keyboard: focus checkbox + Space toggle → Save enabled | ✅ |
| 12 | a11y | `#announcer` (live region) cập nhật text khi enter-edit và khi save | ✅ |

## Follow-up / defer (no silent gap)

- **Non-admin AuthZ** (#3): `test.fixme` — cần dedicated non-admin storageState project; `admin-authz/` đã phủ denial /admin/*.
- **App catalog rỗng** (#5): backend luôn có 6 app đã seed (`web-apps.ts`) → không reproducible qua E2E thật mà không xóa/seed riêng cho biến thể này. `EntitlementMatrixEmpty` nên được phủ ở component/unit test nếu cần coverage sâu hơn.
- **eligibleCount = 0 boundary** (#6): chỉ có 2 role (`user`/`admin`) trong hệ thống và mọi app-seed yêu cầu 1 trong 2 role đó → luôn có overlap ≥1 với bất kỳ user seed nào. Boundary "check-all disabled vì 0 eligible" tồn tại trong code (`disabled={!hasEligibleApps}`) nhưng không exercise được qua E2E với seed hiện tại.
- **Sticky đo chính xác qua scroll thật** (#6): suite Playwright (gate A) chỉ assert `position:sticky` + `left:0px` qua computed style (không phụ thuộc overflow thật — chỉ 6 cột app, min-width 96px/cột, có thể không đủ để tràn container ở viewport desktop mặc định). Gate B (MCP `browser_evaluate`) đo `getBoundingClientRect` trước/sau khi cuộn ngang thật để verify hành vi hình ảnh — xem Dual-gate bên dưới.
- **Mock error path** (#10): `updateUserGrants` mock luôn `resolve()` thành công → không có nhánh lỗi client có thể trigger mà không sửa mock code (ngoài phạm vi Task 11 "KHÔNG modify app code"). Verify toast-error + "không thoát edit khi lỗi" khi BE thật thay mock (slice sau).
- **`picker.e2e.ts` — potential regression flag (không tự sửa, ngoài phạm vi Task 11)**: `picker.e2e.ts` dòng ~170 assert `page.getByText("App access")).toBeVisible()` dựa trên tiêu đề matrix cũ hiển thị trực tiếp. Ở bản redesign này, `EntitlementMatrixTable` render tiêu đề qua `<TableCaption className="sr-only">{t("title")}</TableCaption>` (§ đã đổi từ heading hiển thị sang caption ẩn cho screen reader) — `sr-only` khiến phần tử **không visible** theo Playwright (`toBeVisible()` sẽ fail). Đây là dấu hiệu suite `picker.e2e.ts` (thuộc feature trước, `admin-entitlements-picker-refinement`) có thể đỏ khi chạy full `yarn e2e` sau khi merge slice này. Task 11 không có quyền sửa `picker.e2e.ts` (ngoài file được giao) — flag cho main loop quyết định (reconcile theo §4.3 "sửa feature đã có" hoặc theo dõi ở dual-gate run).

## Dual-gate (§4.3)

- **Gate A** — `cd client && yarn e2e --project=admin -g "Admin Entitlements Matrix"` trên app thật.
- **Gate B** — MCP browser walk cùng matrix (auth context riêng, KHÔNG share storageState với gate A): walk mọi scenario `A+B` (happy, i18n, a11y, data-render, insufficient-role, check-all, picker-lock, sticky, loading, edit/dirty/cancel); SKIP mutation của scenario `A only` (#11 Save-persist) — chỉ verify read/render cho case đó (không click Save song song với gate A để tránh contaminate mock in-memory state giữa 2 context — dù mock per-page-load nên rủi ro thấp, vẫn theo nguyên tắc `A only` trong design.md).
- Trước khi chạy gate B, chú ý regression flag `picker.e2e.ts` ở trên nếu walk có đụng lại matrix title.
- Fail (≥1 gate) → `systematic-debugging` → ghi `e2e-bugs.md` → fix → re-run cả 2 gate (tối đa 3 vòng).
