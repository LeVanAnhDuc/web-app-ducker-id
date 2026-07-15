# E2E — AdminEntitlements picker refinement

Test file: `client/e2e/admin-entitlements/picker.e2e.ts` (project `admin`, storageState `admin.json`).
Scope: user picker + role filter + layout. User search = REAL `/admin/users`; entitlement matrix = mock (in-memory per browser context → không mutate server, không cần revert). Playwright config: `admin-entitlements/` đã thêm vào `admin` project testMatch + `chromium` testIgnore.

## Scenarios (từ design.md §7)

| # | Nhóm | Test | Trạng thái |
| - | ---- | ---- | ---------- |
| 1 | Happy | header "Entitlements" + search + Filters + empty prompt render | ✅ |
| 1 | Happy | focus search → default users (listbox, 1..6 options) không cần gõ | ✅ |
| 2 | AuthN | unauth → redirect /login | ✅ |
| 3 | AuthZ | admin truy cập + dùng picker OK | ✅ |
| 3 | AuthZ | non-admin denial | ⏸ defer (`test.fixme`) — cần non-admin storageState project; admin-authz suite đã phủ /admin/* denial |
| 5 | Empty | search no-match → "No users found" | ✅ |
| 7 | Filter | gõ text → filtered theo email; user khác vắng mặt **[EP]** | ✅ |
| 7 | Filter | xoá text → về default list **[ST]** | ✅ |
| 7 | Filter | chọn role=Admin → chỉ admin trong kết quả **[DT]** | ✅ |
| 8/11 | Render/mutation | chọn user → chip "Remove {name}" + matrix "App access" hiện, empty prompt biến mất | ✅ |
| 9 | i18n | EN header+Filters, không `[adminEntitlements.*]` missing | ✅ |
| 9 | i18n | VI header "Phân quyền truy cập"+"Bộ lọc", không missing | ✅ |
| 12 | a11y | search combobox `aria-autocomplete=list` | ✅ |
| 12 | a11y | Filters popover mở + đóng bằng Escape | ✅ |

## Follow-up / defer (no silent gap)

- **Non-admin AuthZ** (#3): `test.fixme` — verify đúng cần dedicated non-admin project; đã có `admin-authz/` suite phủ denial /admin/*.
- **Boundary >6 / >20 users** (#6): default limit 6 / search limit 20 assert qua count ≤6; case cần >20 seeded user để verify top-N cap chính xác → defer tới khi seed đủ.
- **Validation search > SEARCH_MAX_LENGTH** (#4): BE 400 path — defer (BE contract đã test riêng ở server; FE chỉ cần không crash, phủ gián tiếp qua no-match).
- **Data render matrix status labels** (#8): phụ thuộc `/admin/apps` + mock entitlement; phủ nhẹ qua "App access" title. Chi tiết status (All granted/M-N) verify sâu khi entitlement thật (slice sau).

## Dual-gate (§4.3)

- **Gate A** — `cd client && yarn e2e --project=admin -g "Admin Entitlements"` trên app thật.
- **Gate B** — MCP browser walk cùng matrix (auth context riêng, đọc/render only; mock mutation an toàn vì in-memory per-context).
- Fail → `systematic-debugging` → `e2e-bugs.md` → fix → re-run (max 3 vòng).
